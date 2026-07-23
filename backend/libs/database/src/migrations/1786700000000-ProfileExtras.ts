import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileExtras1786700000000 implements MigrationInterface {
  name = 'ProfileExtras1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "saved_travelers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "relationship" character varying,
        "cnic" character varying,
        "gender" character varying,
        "dob" date,
        "seatPreference" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_travelers_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_saved_travelers_user" ON "saved_travelers" ("userId")`);
    await queryRunner.query(`
      CREATE TABLE "saved_addresses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "label" character varying NOT NULL,
        "line" character varying,
        "area" character varying,
        "city" character varying,
        "lat" double precision,
        "lng" double precision,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_addresses_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_saved_addresses_user" ON "saved_addresses" ("userId")`);
    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "prefs" jsonb NOT NULL DEFAULT '{}',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_notif_prefs_user" ON "notification_preferences" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(`DROP TABLE "saved_addresses"`);
    await queryRunner.query(`DROP TABLE "saved_travelers"`);
  }
}
