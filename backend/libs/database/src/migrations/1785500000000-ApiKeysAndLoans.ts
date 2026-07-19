import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApiKeysAndLoans1785500000000 implements MigrationInterface {
  name = 'ApiKeysAndLoans1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying NOT NULL,
        "companyId" character varying,
        "name" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastUsedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_keys_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_api_keys_key" ON "api_keys" ("key")`);

    await queryRunner.query(`
      CREATE TABLE "operator_loans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying NOT NULL,
        "principal" numeric(12,2) NOT NULL,
        "feePct" numeric(5,2) NOT NULL DEFAULT 5,
        "totalDue" numeric(12,2) NOT NULL,
        "amountRepaid" numeric(12,2) NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'REQUESTED',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_operator_loans_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_operator_loans_companyId" ON "operator_loans" ("companyId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "operator_loans"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
  }
}
