import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkflowEngine1785800000000 implements MigrationInterface {
  name = 'WorkflowEngine1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "workflow_definitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying,
        "name" character varying NOT NULL,
        "description" character varying,
        "category" character varying NOT NULL DEFAULT 'GENERAL',
        "steps" jsonb NOT NULL DEFAULT '[]',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_definitions_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_workflow_defs_company_active" ON "workflow_definitions" ("companyId", "isActive")`);

    await queryRunner.query(`
      CREATE TABLE "workflow_instances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "definitionId" character varying NOT NULL,
        "companyId" character varying,
        "title" character varying NOT NULL,
        "amount" numeric(12,2),
        "context" jsonb NOT NULL DEFAULT '{}',
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "currentStep" integer NOT NULL DEFAULT 0,
        "steps" jsonb NOT NULL DEFAULT '[]',
        "history" jsonb NOT NULL DEFAULT '[]',
        "requestedBy" character varying NOT NULL,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_instances_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_workflow_inst_company_status" ON "workflow_instances" ("companyId", "status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workflow_instances"`);
    await queryRunner.query(`DROP TABLE "workflow_definitions"`);
  }
}
