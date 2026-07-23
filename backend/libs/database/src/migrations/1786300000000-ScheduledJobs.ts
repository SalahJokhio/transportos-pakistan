import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScheduledJobs1786300000000 implements MigrationInterface {
  name = 'ScheduledJobs1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "scheduled_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying,
        "name" character varying NOT NULL,
        "jobType" character varying NOT NULL,
        "frequency" character varying NOT NULL DEFAULT 'DAILY',
        "isActive" boolean NOT NULL DEFAULT true,
        "lastRunAt" TIMESTAMP,
        "lastResult" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduled_jobs_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_scheduled_jobs_active" ON "scheduled_jobs" ("isActive")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "scheduled_jobs"`);
  }
}
