import { MigrationInterface, QueryRunner } from 'typeorm';

export class SlaEngine1786000000000 implements MigrationInterface {
  name = 'SlaEngine1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "sla_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying,
        "tiers" jsonb NOT NULL DEFAULT '{}',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sla_configs_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_sla_configs_company" ON "sla_configs" ("companyId")`);

    await queryRunner.query(`
      CREATE TABLE "sla_escalations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying,
        "subjectType" character varying NOT NULL DEFAULT 'TICKET',
        "subjectId" character varying NOT NULL,
        "level" integer NOT NULL DEFAULT 1,
        "reason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sla_escalations_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_sla_esc_subject_level" ON "sla_escalations" ("subjectType", "subjectId", "level")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sla_escalations"`);
    await queryRunner.query(`DROP TABLE "sla_configs"`);
  }
}
