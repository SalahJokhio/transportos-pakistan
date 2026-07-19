import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendanceShifts1785000000000 implements MigrationInterface {
  name = 'AttendanceShifts1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "attendance" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeId" character varying NOT NULL,
        "companyId" character varying NOT NULL,
        "date" date NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PRESENT',
        "note" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_attendance_employeeId" ON "attendance" ("employeeId")`);
    await queryRunner.query(`CREATE INDEX "IDX_attendance_company_date" ON "attendance" ("companyId", "date")`);

    await queryRunner.query(`
      CREATE TABLE "agent_shifts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agentId" character varying NOT NULL,
        "companyId" character varying,
        "status" character varying NOT NULL DEFAULT 'OPEN',
        "openingCash" numeric(12,2) NOT NULL DEFAULT 0,
        "closingCash" numeric(12,2) NOT NULL DEFAULT 0,
        "cashCollected" numeric(12,2) NOT NULL DEFAULT 0,
        "bookingsCount" integer NOT NULL DEFAULT 0,
        "closedAt" TIMESTAMP,
        "openedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agent_shifts_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_agent_shifts_agentId" ON "agent_shifts" ("agentId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "agent_shifts"`);
    await queryRunner.query(`DROP TABLE "attendance"`);
  }
}
