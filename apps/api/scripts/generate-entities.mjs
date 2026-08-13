#!/usr/bin/env node
/**
 * Prisma schema → TypeORM entity generator.
 *
 * Usage (from apps/api):
 *   node scripts/generate-entities.mjs
 */
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(__dirname, '..');
const SCHEMA_PATH = join(API_ROOT, 'prisma', 'schema.prisma');
const OUT_DIR = join(API_ROOT, 'src', 'entities');

const SCALAR_TYPES = new Set([
  'String',
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'Boolean',
  'DateTime',
  'Json',
  'Bytes',
]);

function pascalToKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function stripLineComment(line) {
  const inString = { q: null };
  let out = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString.q) {
      out += ch;
      if (ch === '\\' && i + 1 < line.length) {
        out += line[++i];
        continue;
      }
      if (ch === inString.q) inString.q = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString.q = ch;
      out += ch;
      continue;
    }
    if (ch === '/' && line[i + 1] === '/') break;
    out += ch;
  }
  return out.trimEnd();
}

function stripBlockComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseBalancedArgs(text, startIdx) {
  // text[startIdx] should be '('
  let depth = 0;
  let i = startIdx;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return text.slice(startIdx + 1, i);
    }
  }
  return text.slice(startIdx + 1);
}

function parseAttributes(attrText) {
  const attrs = [];
  const re = /@(\w+)/g;
  let m;
  while ((m = re.exec(attrText)) !== null) {
    const name = m[1];
    const after = attrText[m.index + m[0].length];
    let args = null;
    if (after === '(') {
      args = parseBalancedArgs(attrText, m.index + m[0].length);
      re.lastIndex = m.index + m[0].length + args.length + 2;
    }
    attrs.push({ name, args });
  }
  return attrs;
}

function parseSchema(raw) {
  const src = stripBlockComments(raw);
  const lines = src.split(/\r?\n/).map(stripLineComment);

  const enums = [];
  const models = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    const enumMatch = line.match(/^enum\s+(\w+)\s*\{/);
    if (enumMatch) {
      const name = enumMatch[1];
      const values = [];
      i++;
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l === '}') break;
        if (l && !l.startsWith('@@')) {
          const v = l.split(/\s+/)[0];
          if (/^[A-Z][A-Z0-9_]*$/.test(v)) values.push(v);
        }
        i++;
      }
      enums.push({ name, values });
      i++;
      continue;
    }

    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      const name = modelMatch[1];
      const fields = [];
      const modelAttrs = [];
      i++;
      while (i < lines.length) {
        const rawLine = lines[i];
        const l = rawLine.trim();
        if (l === '}') break;
        if (!l) {
          i++;
          continue;
        }
        if (l.startsWith('@@')) {
          const am = l.match(/^@@(\w+)(?:\((.*)\))?$/);
          if (am) modelAttrs.push({ name: am[1], args: am[2] ?? null });
          i++;
          continue;
        }

        // field: name Type attrs...
        const fm = l.match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);
        if (fm) {
          const [, fieldName, typeName, arr, opt, rest] = fm;
          const attrs = parseAttributes(rest || '');
          fields.push({
            name: fieldName,
            typeName,
            isArray: Boolean(arr),
            isOptional: Boolean(opt),
            attrs,
          });
        }
        i++;
      }
      models.push({ name, fields, modelAttrs });
      i++;
      continue;
    }

    i++;
  }

  return { enums, models };
}

function getAttr(field, name) {
  return field.attrs.find((a) => a.name === name) || null;
}

function hasAttr(field, name) {
  return field.attrs.some((a) => a.name === name);
}

function parseRelationArgs(args) {
  if (!args) return { name: null, fields: [], references: [] };
  let relationName = null;
  const nameMatch = args.match(/^\s*"([^"]+)"\s*,?/);
  let rest = args;
  if (nameMatch) {
    relationName = nameMatch[1];
    rest = args.slice(nameMatch[0].length);
  }
  const fieldsMatch = rest.match(/fields:\s*\[([^\]]*)\]/);
  const refsMatch = rest.match(/references:\s*\[([^\]]*)\]/);
  const fields = fieldsMatch
    ? fieldsMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const references = refsMatch
    ? refsMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  return { name: relationName, fields, references };
}

function parseDbDecimal(args) {
  if (!args) return { precision: 18, scale: 2 };
  const m = args.match(/(\d+)\s*,\s*(\d+)/);
  if (!m) return { precision: 18, scale: 2 };
  return { precision: Number(m[1]), scale: Number(m[2]) };
}

function parseDefault(args) {
  if (args == null) return null;
  const a = args.trim();
  if (a === 'uuid()' || a === 'cuid()' || a === 'now()' || a === 'autoincrement()') {
    return { kind: 'fn', value: a };
  }
  if (a === 'true' || a === 'false') return { kind: 'bool', value: a === 'true' };
  if (/^-?\d+(\.\d+)?$/.test(a)) return { kind: 'number', value: Number(a) };
  if (a.startsWith('"') && a.endsWith('"')) {
    return { kind: 'string', value: JSON.parse(a) };
  }
  if (a.startsWith('[') && a.endsWith(']')) {
    try {
      // Prisma array defaults like [1, 2, 3] or []
      const inner = a.slice(1, -1).trim();
      if (!inner) return { kind: 'array', value: [] };
      const parts = inner.split(',').map((s) => s.trim());
      const nums = parts.map((p) => Number(p));
      if (nums.every((n) => !Number.isNaN(n))) return { kind: 'array', value: nums };
      return { kind: 'raw', value: a };
    } catch {
      return { kind: 'raw', value: a };
    }
  }
  // Enum-like identifier
  if (/^[A-Z][A-Z0-9_]*$/.test(a)) return { kind: 'enum', value: a };
  return { kind: 'raw', value: a };
}

function isEnumType(typeName, enumNames) {
  return enumNames.has(typeName);
}

function isRelationField(field, modelNames, enumNames) {
  if (SCALAR_TYPES.has(field.typeName)) return false;
  if (enumNames.has(field.typeName)) return false;
  return modelNames.has(field.typeName) || hasAttr(field, 'relation');
}

function getPrimaryKeyFields(model) {
  const idFields = model.fields.filter((f) => hasAttr(f, 'id'));
  if (idFields.length) return idFields.map((f) => f.name);

  const idAttr = model.modelAttrs.find((a) => a.name === 'id');
  if (idAttr?.args) {
    return idAttr.args
      .replace(/[\[\]]/g, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function tsDefaultLiteral(def, enumType, fieldTypeName) {
  if (!def) return null;
  switch (def.kind) {
    case 'bool':
      return String(def.value);
    case 'number':
      return String(def.value);
    case 'string':
      // Prisma Json defaults look like "{}" / "[]" and parse as those strings.
      if (fieldTypeName === 'Json' && typeof def.value === 'string') {
        try {
          return JSON.stringify(JSON.parse(def.value));
        } catch {
          return JSON.stringify(def.value);
        }
      }
      return JSON.stringify(def.value);
    case 'array':
      return JSON.stringify(def.value);
    case 'enum':
      return enumType ? `${enumType}.${def.value}` : JSON.stringify(def.value);
    case 'fn':
      return null;
    default:
      return null;
  }
}

function generateEnumsFile(enums) {
  const blocks = enums.map((e) => {
    const members = e.values.map((v) => `  ${v} = '${v}',`).join('\n');
    return `export enum ${e.name} {\n${members}\n}`;
  });
  return `/* Auto-generated from prisma/schema.prisma — do not edit by hand. */\n\n${blocks.join('\n\n')}\n`;
}

function generateDecimalTransformer() {
  return `/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

/**
 * Postgres \`decimal\` / \`numeric\` arrives as string; convert to JS number for the app.
 */
export class ColumnNumericTransformer {
  to(value?: number | null): number | null {
    if (value === null || value === undefined) return null;
    return value;
  }

  from(value?: string | number | null): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
}
`;
}

function collectImportsForModel(model, ctx) {
  const typeorm = new Set([
    'Entity',
    'Column',
  ]);
  const enums = new Set();
  const entities = new Set();
  let needsDecimal = false;

  const pkFields = new Set(getPrimaryKeyFields(model));
  const hasGeneratedUuidPk =
    pkFields.size === 1 &&
    [...pkFields].some((name) => {
      const f = model.fields.find((x) => x.name === name);
      const def = f && getAttr(f, 'default');
      return f && hasAttr(f, 'id') && def && parseDefault(def.args)?.kind === 'fn' && parseDefault(def.args)?.value === 'uuid()';
    });

  if (hasGeneratedUuidPk) typeorm.add('PrimaryGeneratedColumn');
  if ([...pkFields].some((n) => {
    const f = model.fields.find((x) => x.name === n);
    if (!f) return false;
    const def = getAttr(f, 'default');
    const parsed = def ? parseDefault(def.args) : null;
    return !(hasAttr(f, 'id') && parsed?.value === 'uuid()' && pkFields.size === 1);
  }) || (pkFields.size > 1)) {
    // composite or non-uuid-generated
    const needsPrimaryColumn = [...pkFields].some((n) => {
      const f = model.fields.find((x) => x.name === n);
      if (!f) return true;
      const def = getAttr(f, 'default');
      const parsed = def ? parseDefault(def.args) : null;
      return !(pkFields.size === 1 && hasAttr(f, 'id') && parsed?.value === 'uuid()');
    });
    if (needsPrimaryColumn) typeorm.add('PrimaryColumn');
  }

  for (const field of model.fields) {
    if (isRelationField(field, ctx.modelNames, ctx.enumNames)) {
      const rel = parseRelationArgs(getAttr(field, 'relation')?.args);
      if (rel.fields.length) {
        typeorm.add('ManyToOne');
        typeorm.add('JoinColumn');
      } else if (field.isArray) {
        typeorm.add('OneToMany');
      } else {
        // optional 1-1 inverse without fields
        typeorm.add('OneToOne');
      }
      entities.add(field.typeName);
      continue;
    }

    if (field.name === 'createdAt' && hasAttr(field, 'default')) {
      const d = parseDefault(getAttr(field, 'default').args);
      if (d?.value === 'now()') typeorm.add('CreateDateColumn');
    }
    if (field.name === 'updatedAt' && hasAttr(field, 'updatedAt')) {
      typeorm.add('UpdateDateColumn');
    }

    if (ctx.enumNames.has(field.typeName)) enums.add(field.typeName);
    if (field.typeName === 'Decimal') needsDecimal = true;
  }

  // OneToOne owning side (unique FK pointing to another model) — still ManyToOne/OneToOne
  // Staff.user is optional OneToOne with fields
  for (const field of model.fields) {
    if (!isRelationField(field, ctx.modelNames, ctx.enumNames)) continue;
    const rel = parseRelationArgs(getAttr(field, 'relation')?.args);
    if (rel.fields.length === 1) {
      const fk = model.fields.find((f) => f.name === rel.fields[0]);
      if (fk && hasAttr(fk, 'unique') && !field.isArray) {
        typeorm.delete('ManyToOne');
        typeorm.add('OneToOne');
        typeorm.add('JoinColumn');
      }
    }
  }

  return { typeorm, enums, entities, needsDecimal };
}

function columnDecoratorForScalar(field, ctx, pkFields) {
  const isPk = pkFields.has(field.name);
  const defAttr = getAttr(field, 'default');
  const def = defAttr ? parseDefault(defAttr.args) : null;
  const dbAttr = field.attrs.find((a) => a.name === 'db');
  // @db.X is parsed as name=db with weird args — our parser sees @db.Uuid as @db then ".Uuid"?
  // Actually parseAttributes: @db.Uuid — the regex is @(\w+) so it gets "db", then next char is '.' not '('
  // So @db.Uuid / @db.Decimal / @db.Date need special handling.

  // Re-parse db native from raw attrs differently — look in original attr strings
  let dbNative = null;
  let dbDecimal = null;
  for (const a of field.attrs) {
    // Won't catch @db.Xxx — fix below via field._db
  }
  if (field._db) {
    dbNative = field._db.name;
    if (field._db.name === 'Decimal' && field._db.args) {
      dbDecimal = parseDbDecimal(field._db.args);
    }
  }

  if (isPk) {
    if (
      pkFields.size === 1 &&
      hasAttr(field, 'id') &&
      def?.kind === 'fn' &&
      def.value === 'uuid()'
    ) {
      return { decorator: `@PrimaryGeneratedColumn('uuid')`, tsType: 'string' };
    }
    // composite or plain PK
    if (field.typeName === 'String' && (dbNative === 'Uuid' || hasAttr(field, 'id'))) {
      // uuid FKs used as composite PK
      if (dbNative === 'Uuid') {
        return { decorator: `@PrimaryColumn('uuid')`, tsType: 'string' };
      }
    }
    if (dbNative === 'Uuid') {
      return { decorator: `@PrimaryColumn('uuid')`, tsType: 'string' };
    }
    return { decorator: `@PrimaryColumn()`, tsType: mapTsType(field, ctx) };
  }

  // createdAt / updatedAt specials
  if (field.name === 'createdAt' && def?.value === 'now()') {
    return {
      decorator: `@CreateDateColumn({ type: 'timestamp' })`,
      tsType: 'Date',
    };
  }
  if (field.name === 'updatedAt' && hasAttr(field, 'updatedAt')) {
    return {
      decorator: `@UpdateDateColumn({ type: 'timestamp' })`,
      tsType: 'Date',
    };
  }

  const opts = [];
  let tsType = mapTsType(field, ctx);

  if (ctx.enumNames.has(field.typeName)) {
    opts.push(`type: 'enum'`);
    opts.push(`enum: ${field.typeName}`);
    opts.push(`enumName: '${field.typeName}'`);
    if (field.isArray) opts.push('array: true');
  } else if (field.typeName === 'String' && field.isArray) {
    opts.push(`type: 'text'`);
    opts.push('array: true');
  } else if (field.typeName === 'Int' && field.isArray) {
    opts.push(`type: 'int'`);
    opts.push('array: true');
  } else if (field.typeName === 'String') {
    if (dbNative === 'Uuid') {
      opts.push(`type: 'uuid'`);
    } else {
      opts.push(`type: 'text'`);
    }
  } else if (field.typeName === 'Int') {
    opts.push(`type: 'int'`);
  } else if (field.typeName === 'Boolean') {
    opts.push(`type: 'boolean'`);
  } else if (field.typeName === 'DateTime') {
    if (dbNative === 'Date') {
      opts.push(`type: 'date'`);
    } else {
      opts.push(`type: 'timestamp'`);
    }
  } else if (field.typeName === 'Decimal') {
    const { precision, scale } = dbDecimal || { precision: 18, scale: 2 };
    opts.push(`type: 'decimal'`);
    opts.push(`precision: ${precision}`);
    opts.push(`scale: ${scale}`);
    opts.push('transformer: ColumnNumericTransformer');
  } else if (field.typeName === 'Json') {
    opts.push(`type: 'jsonb'`);
    tsType = 'Record<string, unknown> | unknown[] | null';
    if (!field.isOptional) tsType = 'Record<string, unknown> | unknown[]';
  } else if (field.typeName === 'Float') {
    opts.push(`type: 'double precision'`);
  } else {
    opts.push(`type: 'text'`);
  }

  if (field.isOptional) opts.push('nullable: true');

  const lit = tsDefaultLiteral(
    def,
    ctx.enumNames.has(field.typeName) ? field.typeName : null,
    field.typeName,
  );
  if (lit !== null) {
    opts.push(`default: ${lit}`);
  }

  // unique on column
  if (hasAttr(field, 'unique')) opts.push('unique: true');

  const decorator = `@Column({ ${opts.join(', ')} })`;
  if (field.isOptional && !tsType.endsWith('| null') && field.typeName !== 'Json') {
    tsType = `${tsType} | null`;
  }
  return { decorator, tsType };
}

function mapTsType(field, ctx) {
  if (ctx.enumNames.has(field.typeName)) {
    return field.isArray ? `${field.typeName}[]` : field.typeName;
  }
  switch (field.typeName) {
    case 'String':
      return field.isArray ? 'string[]' : 'string';
    case 'Int':
    case 'Float':
    case 'Decimal':
      return field.isArray ? 'number[]' : 'number';
    case 'Boolean':
      return 'boolean';
    case 'DateTime':
      return 'Date';
    case 'Json':
      return 'Record<string, unknown> | unknown[]';
    default:
      return 'unknown';
  }
}

function enrichDbAttrs(field, rawFieldLine) {
  // Extract @db.Xxx or @db.Xxx(...)
  const m = rawFieldLine.match(/@db\.(\w+)(?:\(([^)]*)\))?/);
  if (m) {
    field._db = { name: m[1], args: m[2] ?? null };
  }
}

function reparseFieldsWithDb(model, rawModelBody) {
  // rawModelBody lines for db attrs — we already parsed fields; attach _db from schema by matching field names
  // Better: enhance parseSchema to capture @db
}

// Improve attribute parser for @db.Decimal(16, 2)
function parseAttributesImproved(attrText) {
  const attrs = [];
  let i = 0;
  while (i < attrText.length) {
    if (attrText[i] !== '@') {
      i++;
      continue;
    }
    i++; // skip @
    // db.Uuid or name or name(...)
    if (attrText.startsWith('db.', i)) {
      i += 3;
      const nameMatch = attrText.slice(i).match(/^(\w+)/);
      if (!nameMatch) continue;
      const dbName = nameMatch[1];
      i += dbName.length;
      let args = null;
      if (attrText[i] === '(') {
        args = parseBalancedArgs(attrText, i);
        i += args.length + 2;
      }
      attrs.push({ name: 'db', dbName, args });
      continue;
    }
    const nameMatch = attrText.slice(i).match(/^(\w+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    i += name.length;
    let args = null;
    if (attrText[i] === '(') {
      args = parseBalancedArgs(attrText, i);
      i += args.length + 2;
    }
    attrs.push({ name, args });
  }
  return attrs;
}

function parseSchemaV2(raw) {
  const src = stripBlockComments(raw);
  const lines = src.split(/\r?\n/).map(stripLineComment);

  const enums = [];
  const models = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    const enumMatch = line.match(/^enum\s+(\w+)\s*\{/);
    if (enumMatch) {
      const name = enumMatch[1];
      const values = [];
      i++;
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l === '}') break;
        if (l) {
          const v = l.split(/\s+/)[0];
          if (/^[A-Z][A-Z0-9_]*$/.test(v)) values.push(v);
        }
        i++;
      }
      enums.push({ name, values });
      i++;
      continue;
    }

    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      const name = modelMatch[1];
      const fields = [];
      const modelAttrs = [];
      i++;
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l === '}') break;
        if (!l) {
          i++;
          continue;
        }
        if (l.startsWith('@@')) {
          const am = l.match(/^@@(\w+)\s*(?:\((.*)\))?$/);
          if (am) modelAttrs.push({ name: am[1], args: am[2] ?? null });
          i++;
          continue;
        }

        const fm = l.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
        if (fm) {
          const [, fieldName, typeName, arr, opt, rest] = fm;
          const attrs = parseAttributesImproved(rest || '');
          const field = {
            name: fieldName,
            typeName,
            isArray: Boolean(arr),
            isOptional: Boolean(opt),
            attrs,
            _db: null,
          };
          const dbAttr = attrs.find((a) => a.name === 'db');
          if (dbAttr) field._db = { name: dbAttr.dbName, args: dbAttr.args };
          fields.push(field);
        }
        i++;
      }
      models.push({ name, fields, modelAttrs });
      i++;
      continue;
    }

    i++;
  }

  return { enums, models };
}

function findInverseSide(ctx, modelName, field) {
  // Try to find the opposite field for relation callback
  const target = ctx.modelsByName.get(field.typeName);
  if (!target) return null;

  const rel = parseRelationArgs(getAttr(field, 'relation')?.args);
  const candidates = target.fields.filter((f) => f.typeName === modelName);

  if (rel.name) {
    const named = candidates.find((f) => {
      const r = parseRelationArgs(getAttr(f, 'relation')?.args);
      return r.name === rel.name;
    });
    if (named) return named.name;
  }

  // Prefer field that has opposite fields:[] pointing here, or array inverse
  if (rel.fields.length) {
    // We are owning side; inverse often has no fields
    const inverse = candidates.find((f) => {
      const r = parseRelationArgs(getAttr(f, 'relation')?.args);
      return r.fields.length === 0 && (!rel.name || r.name === rel.name || !r.name);
    });
    if (inverse) return inverse.name;
    if (candidates.length === 1) return candidates[0].name;
  } else {
    // We are inverse; find owning side
    const owning = candidates.find((f) => {
      const r = parseRelationArgs(getAttr(f, 'relation')?.args);
      return r.fields.length > 0 && (!rel.name || r.name === rel.name || !getAttr(f, 'relation') || true);
    });
    if (rel.name) {
      const named = candidates.find((f) => {
        const r = parseRelationArgs(getAttr(f, 'relation')?.args);
        return r.name === rel.name;
      });
      if (named) return named.name;
    }
    if (owning) return owning.name;
    if (candidates.length === 1) return candidates[0].name;
  }
  return candidates[0]?.name ?? null;
}

function isOneToOneOwning(model, field) {
  const rel = parseRelationArgs(getAttr(field, 'relation')?.args);
  if (!rel.fields.length || field.isArray) return false;
  if (rel.fields.length !== 1) return false;
  const fk = model.fields.find((f) => f.name === rel.fields[0]);
  return Boolean(fk && (hasAttr(fk, 'unique') || /* TenantSettings.tenantId */ false));
}

function generateEntityFile(model, ctx) {
  const pkFields = new Set(getPrimaryKeyFields(model));
  const relationFieldNames = new Set(
    model.fields
      .filter((f) => isRelationField(f, ctx.modelNames, ctx.enumNames))
      .map((f) => f.name),
  );

  // FK scalar columns that are also used in relations still get Column decorators
  const typeormImports = new Set(['Entity']);
  const enumImports = new Set();
  const entityImports = new Set();
  let needsDecimal = false;

  const propertyBlocks = [];

  for (const field of model.fields) {
    if (isRelationField(field, ctx.modelNames, ctx.enumNames)) {
      const rel = parseRelationArgs(getAttr(field, 'relation')?.args);
      const inverse = findInverseSide(ctx, model.name, field);
      const target = field.typeName;
      entityImports.add(target);

      const inverseCb = inverse
        ? `, (${target[0].toLowerCase()}${target.slice(1)}: ${target}) => ${target[0].toLowerCase()}${target.slice(1)}.${inverse}`
        : '';

      // Unique shortened param to avoid reserved words — use `related`
      const inverseCbSafe = inverse
        ? `, (related) => related.${inverse}`
        : '';

      if (rel.fields.length) {
        // Owning side
        const fkUnique =
          rel.fields.length === 1 &&
          model.fields.some((f) => f.name === rel.fields[0] && hasAttr(f, 'unique'));

        // Also treat as OneToOne when target has optional back-ref that's singular
        // e.g. Tenant.settings / Staff.user
        const targetModel = ctx.modelsByName.get(target);
        const back = inverse && targetModel
          ? targetModel.fields.find((f) => f.name === inverse)
          : null;
        const isO2O =
          fkUnique ||
          (back && !back.isArray && !field.isArray);

        if (isO2O) {
          typeormImports.add('OneToOne');
          typeormImports.add('JoinColumn');
          const join =
            rel.fields.length === 1
              ? `\n  @JoinColumn({ name: '${rel.fields[0]}' })`
              : `\n  @JoinColumn([${rel.fields.map((f) => `{ name: '${f}' }`).join(', ')}])`;
          propertyBlocks.push(
            `  @OneToOne(() => ${target}${inverseCbSafe})${join}\n  ${field.name}${field.isOptional ? '!:' : '!:'} ${target}${field.isOptional ? ' | null' : ''};`,
          );
        } else {
          typeormImports.add('ManyToOne');
          typeormImports.add('JoinColumn');
          const join =
            rel.fields.length === 1
              ? `\n  @JoinColumn({ name: '${rel.fields[0]}' })`
              : `\n  @JoinColumn([${rel.fields.map((f) => `{ name: '${f}' }`).join(', ')}])`;
          propertyBlocks.push(
            `  @ManyToOne(() => ${target}${inverseCbSafe}, { nullable: ${field.isOptional} })${join}\n  ${field.name}!: ${target}${field.isOptional ? ' | null' : ''};`,
          );
        }
      } else if (field.isArray) {
        typeormImports.add('OneToMany');
        propertyBlocks.push(
          `  @OneToMany(() => ${target}${inverseCbSafe})\n  ${field.name}!: ${target}[];`,
        );
      } else {
        // Inverse OneToOne
        typeormImports.add('OneToOne');
        propertyBlocks.push(
          `  @OneToOne(() => ${target}${inverseCbSafe})\n  ${field.name}!: ${target}${field.isOptional ? ' | null' : ''};`,
        );
      }
      continue;
    }

    // Scalar
    if (ctx.enumNames.has(field.typeName)) enumImports.add(field.typeName);
    if (field.typeName === 'Decimal') needsDecimal = true;

    const { decorator, tsType } = columnDecoratorForScalar(field, ctx, pkFields);
    if (decorator.includes('@Column')) typeormImports.add('Column');
    if (decorator.includes('PrimaryGeneratedColumn')) typeormImports.add('PrimaryGeneratedColumn');
    if (decorator.includes('PrimaryColumn')) typeormImports.add('PrimaryColumn');
    if (decorator.includes('CreateDateColumn')) typeormImports.add('CreateDateColumn');
    if (decorator.includes('UpdateDateColumn')) typeormImports.add('UpdateDateColumn');

    propertyBlocks.push(`  ${decorator}\n  ${field.name}!: ${tsType};`);
  }

  // Don't import self
  entityImports.delete(model.name);

  const importLines = [];
  const typeormList = [...typeormImports].sort();
  importLines.push(`import {\n  ${typeormList.join(',\n  ')},\n} from 'typeorm';`);

  if (needsDecimal) {
    importLines.push(`import { ColumnNumericTransformer } from './decimal.transformer';`);
  }
  if (enumImports.size) {
    importLines.push(
      `import { ${[...enumImports].sort().join(', ')} } from './enums';`,
    );
  }
  for (const ent of [...entityImports].sort()) {
    importLines.push(
      `import { ${ent} } from './${pascalToKebab(ent)}.entity';`,
    );
  }

  return `${`/* Auto-generated from prisma/schema.prisma — do not edit by hand. */`}

${importLines.join('\n')}

@Entity('${model.name}')
export class ${model.name} {
${propertyBlocks.join('\n\n')}
}
`;
}

function generateIndex(models) {
  const imports = models
    .map(
      (m) =>
        `import { ${m.name} } from './${pascalToKebab(m.name)}.entity';`,
    )
    .join('\n');
  const exports = models
    .map((m) => `export { ${m.name} } from './${pascalToKebab(m.name)}.entity';`)
    .join('\n');
  const enumExport = `export * from './enums';`;
  const decimalExport = `export { ColumnNumericTransformer } from './decimal.transformer';`;
  const all = `export const ALL_ENTITIES = [\n${models.map((m) => `  ${m.name},`).join('\n')}\n] as const;`;

  return `/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

${imports}

${enumExport}
${decimalExport}
${exports}

${all}
`;
}

async function cleanOldEntities() {
  let files;
  try {
    files = await readdir(OUT_DIR);
  } catch {
    return;
  }
  for (const f of files) {
    if (
      f.endsWith('.entity.ts') ||
      f === 'enums.ts' ||
      f === 'decimal.transformer.ts' ||
      f === 'index.ts'
    ) {
      await unlink(join(OUT_DIR, f));
    }
  }
}

async function main() {
  const raw = await readFile(SCHEMA_PATH, 'utf8');
  const { enums, models } = parseSchemaV2(raw);

  const enumNames = new Set(enums.map((e) => e.name));
  const modelNames = new Set(models.map((m) => m.name));
  const modelsByName = new Map(models.map((m) => [m.name, m]));
  const ctx = { enums, models, enumNames, modelNames, modelsByName };

  await mkdir(OUT_DIR, { recursive: true });
  await cleanOldEntities();

  await writeFile(join(OUT_DIR, 'enums.ts'), generateEnumsFile(enums), 'utf8');
  await writeFile(
    join(OUT_DIR, 'decimal.transformer.ts'),
    generateDecimalTransformer(),
    'utf8',
  );

  for (const model of models) {
    const file = `${pascalToKebab(model.name)}.entity.ts`;
    const content = generateEntityFile(model, ctx);
    await writeFile(join(OUT_DIR, file), content, 'utf8');
  }

  await writeFile(join(OUT_DIR, 'index.ts'), generateIndex(models), 'utf8');

  console.log(
    `Generated ${models.length} entities, ${enums.length} enums → ${OUT_DIR}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
