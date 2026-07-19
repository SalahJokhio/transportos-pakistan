import { MigrationInterface, QueryRunner } from 'typeorm';

export class Coupons1784300000000 implements MigrationInterface {
  name = 'Coupons1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying NOT NULL,
        "type" character varying NOT NULL DEFAULT 'PERCENT',
        "value" numeric(10,2) NOT NULL,
        "maxDiscount" numeric(10,2),
        "minAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "usageLimit" integer,
        "usedCount" integer NOT NULL DEFAULT 0,
        "expiresAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coupons_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_coupons_code" ON "coupons" ("code")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_coupons_code"`);
    await queryRunner.query(`DROP TABLE "coupons"`);
  }
}
