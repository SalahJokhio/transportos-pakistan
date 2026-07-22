import { MigrationInterface, QueryRunner } from 'typeorm';

export class TerminalsAndSchedules1785600000000 implements MigrationInterface {
  name = 'TerminalsAndSchedules1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Terminals directory
    await queryRunner.query(`
      CREATE TABLE "terminals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying NOT NULL,
        "city" character varying NOT NULL,
        "name" character varying NOT NULL,
        "landmark" character varying,
        "address" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_terminals_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_terminals_company_city" ON "terminals" ("companyId", "city")`);

    // Recurring schedules
    await queryRunner.query(`
      CREATE TABLE "schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying NOT NULL,
        "routeId" character varying NOT NULL,
        "busId" character varying NOT NULL,
        "driverId" character varying,
        "departureTime" character varying NOT NULL,
        "daysOfWeek" integer array NOT NULL DEFAULT '{}',
        "basePrice" numeric(10,2) NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schedules_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_schedules_companyId" ON "schedules" ("companyId")`);

    // Route boarding / dropping points
    await queryRunner.query(`ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "boardingPoints" jsonb NOT NULL DEFAULT '[]'`);
    await queryRunner.query(`ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "droppingPoints" jsonb NOT NULL DEFAULT '[]'`);

    // Booking boarding / drop-off choice
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "boardingPoint" character varying`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dropoffPoint" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "dropoffPoint"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "boardingPoint"`);
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN IF EXISTS "droppingPoints"`);
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN IF EXISTS "boardingPoints"`);
    await queryRunner.query(`DROP TABLE "schedules"`);
    await queryRunner.query(`DROP TABLE "terminals"`);
  }
}
