import { MigrationInterface, QueryRunner } from 'typeorm';

export class CareLostSos1786600000000 implements MigrationInterface {
  name = 'CareLostSos1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "lost_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "companyId" character varying,
        "pnr" character varying,
        "itemName" character varying NOT NULL,
        "description" text,
        "color" character varying,
        "seat" character varying,
        "contactPhone" character varying,
        "status" character varying NOT NULL DEFAULT 'REPORTED',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lost_items_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_lost_items_user" ON "lost_items" ("userId")`);
    await queryRunner.query(`
      CREATE TABLE "sos_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "tripId" character varying,
        "type" character varying NOT NULL DEFAULT 'SOS',
        "lat" double precision,
        "lng" double precision,
        "note" character varying,
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sos_events_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_sos_events_status" ON "sos_events" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sos_events"`);
    await queryRunner.query(`DROP TABLE "lost_items"`);
  }
}
