import { MigrationInterface, QueryRunner } from 'typeorm';

export class Settlements1784200000000 implements MigrationInterface {
  name = 'Settlements1784200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "settlements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying NOT NULL,
        "companyName" character varying,
        "periodStart" date,
        "periodEnd" date,
        "bookingCount" integer NOT NULL DEFAULT 0,
        "grossAmount" numeric(12,2) NOT NULL DEFAULT 0,
        "commissionPct" numeric(5,2) NOT NULL DEFAULT 0,
        "commissionAmount" numeric(12,2) NOT NULL DEFAULT 0,
        "netPayable" numeric(12,2) NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "reference" character varying,
        "paidAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_settlements_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_settlements_companyId" ON "settlements" ("companyId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_settlements_companyId"`);
    await queryRunner.query(`DROP TABLE "settlements"`);
  }
}
