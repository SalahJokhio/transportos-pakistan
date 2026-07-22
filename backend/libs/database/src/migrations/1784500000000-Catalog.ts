import { MigrationInterface, QueryRunner } from 'typeorm';

export class Catalog1784500000000 implements MigrationInterface {
  name = 'Catalog1784500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "cities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "province" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cities_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cities_name" ON "cities" ("name")`);

    await queryRunner.query(`
      CREATE TABLE "banners" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "imageUrl" character varying,
        "linkUrl" character varying,
        "placement" character varying NOT NULL DEFAULT 'HOME',
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_banners_id" PRIMARY KEY ("id")
      )`);

    await queryRunner.query(`
      CREATE TABLE "platform_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying NOT NULL,
        "value" jsonb,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_settings_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_platform_settings_key" ON "platform_settings" ("key")`);

    // Seed a sensible default fare-rule governor.
    await queryRunner.query(
      `INSERT INTO "platform_settings" ("key", "value") VALUES ('fare.rules', '{"minFare":200,"maxFare":15000,"maxSurge":1.6}')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "platform_settings"`);
    await queryRunner.query(`DROP TABLE "banners"`);
    await queryRunner.query(`DROP TABLE "cities"`);
  }
}
