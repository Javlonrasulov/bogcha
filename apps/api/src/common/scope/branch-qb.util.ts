import {
  FindOperator,
  type FindOptionsWhere,
  type SelectQueryBuilder,
} from 'typeorm';

/** `resolveBranchFilter` natijasini QueryBuilder ustuniga qo'llaydi. */
export function applyBranchWhere(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qb: SelectQueryBuilder<any>,
  column: string,
  branchWhere: FindOptionsWhere<{ branchId: string }>,
  paramKey = 'branchFilterIds',
): void {
  const raw = branchWhere.branchId as unknown;
  if (raw === undefined) return;

  let ids: string[] = [];
  if (typeof raw === 'string') {
    ids = [raw];
  } else if (raw instanceof FindOperator) {
    const value = raw.value as string[] | string | undefined;
    if (Array.isArray(value)) ids = value;
    else if (typeof value === 'string') ids = [value];
  }

  if (ids.length === 0) return;
  qb.andWhere(`${column} IN (:...${paramKey})`, { [paramKey]: ids });
}
