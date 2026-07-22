import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutomationEngine1785700000000 implements MigrationInterface {
  name = 'AutomationEngine1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Event Engine log
    await queryRunner.query(`
      CREATE TABLE "platform_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying,
        "type" character varying NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "source" character varying,
        "matchedRules" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_events_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_platform_events_company_type" ON "platform_events" ("companyId", "type")`);
    await queryRunner.query(`CREATE INDEX "IDX_platform_events_type" ON "platform_events" ("type")`);

    // Business Rules Engine
    await queryRunner.query(`
      CREATE TABLE "automation_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying,
        "name" character varying NOT NULL,
        "description" character varying,
        "eventType" character varying NOT NULL,
        "conditions" jsonb NOT NULL DEFAULT '[]',
        "actions" jsonb NOT NULL DEFAULT '[]',
        "isActive" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL DEFAULT 0,
        "fireCount" integer NOT NULL DEFAULT 0,
        "lastFiredAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_automation_rules_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_automation_rules_company_event" ON "automation_rules" ("companyId", "eventType", "isActive")`);

    // Alert inbox (output of alert actions)
    await queryRunner.query(`
      CREATE TABLE "automation_alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying,
        "ruleId" character varying,
        "severity" character varying NOT NULL DEFAULT 'info',
        "title" character varying NOT NULL,
        "message" text,
        "meta" jsonb NOT NULL DEFAULT '{}',
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_automation_alerts_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_automation_alerts_company_read" ON "automation_alerts" ("companyId", "isRead")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "automation_alerts"`);
    await queryRunner.query(`DROP TABLE "automation_rules"`);
    await queryRunner.query(`DROP TABLE "platform_events"`);
  }
}
