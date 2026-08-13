import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FoodConsumptionControl20260813180000 implements MigrationInterface {
  name = 'FoodConsumptionControl20260813180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ProductDailyNorm" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "quantityPerChild" numeric(14,3) NOT NULL,
        "unit" "Unit" NOT NULL,
        "effectiveFrom" date NOT NULL,
        "note" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ProductDailyNorm" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ProductDailyNorm_tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ProductDailyNorm_branch" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ProductDailyNorm_product" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ProductDailyNorm_lookup" ON "ProductDailyNorm" ("tenantId", "branchId", "productId", "effectiveFrom")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ProductDailyNorm_branch_from" ON "ProductDailyNorm" ("branchId", "effectiveFrom")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "FoodConsumptionActual" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "date" date NOT NULL,
        "actualQuantity" numeric(14,3) NOT NULL,
        "unit" "Unit" NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_FoodConsumptionActual" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_FoodConsumptionActual_day_product" UNIQUE ("branchId", "date", "productId"),
        CONSTRAINT "FK_FoodConsumptionActual_tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_FoodConsumptionActual_branch" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_FoodConsumptionActual_product" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_FoodConsumptionActual_range" ON "FoodConsumptionActual" ("tenantId", "branchId", "date")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "FoodStockCheck" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "checkDate" date NOT NULL,
        "countedQuantity" numeric(14,3) NOT NULL,
        "unit" "Unit" NOT NULL,
        "note" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_FoodStockCheck" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_FoodStockCheck_day_product" UNIQUE ("branchId", "checkDate", "productId"),
        CONSTRAINT "FK_FoodStockCheck_tenant" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_FoodStockCheck_branch" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_FoodStockCheck_product" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_FoodStockCheck_range" ON "FoodStockCheck" ("tenantId", "branchId", "checkDate")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "FoodStockCheck"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "FoodConsumptionActual"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ProductDailyNorm"`);
  }
}
