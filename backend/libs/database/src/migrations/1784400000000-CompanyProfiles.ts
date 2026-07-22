import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyProfiles1784400000000 implements MigrationInterface {
  name = 'CompanyProfiles1784400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "company_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying NOT NULL,
        "name" character varying,
        "plan" character varying NOT NULL DEFAULT 'FREE',
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "maxBuses" integer NOT NULL DEFAULT 0,
        "maxRoutes" integer NOT NULL DEFAULT 0,
        "primaryColor" character varying,
        "logoUrl" character varying,
        "contactEmail" character varying,
        "contactPhone" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_profiles_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_company_profiles_companyId" ON "company_profiles" ("companyId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_company_profiles_companyId"`);
    await queryRunner.query(`DROP TABLE "company_profiles"`);
  }
}
