import { MigrationInterface, QueryRunner } from 'typeorm';

export class Broadcasts1784800000000 implements MigrationInterface {
  name = 'Broadcasts1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "broadcasts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying,
        "message" text NOT NULL,
        "channel" character varying NOT NULL DEFAULT 'SMS',
        "segment" character varying NOT NULL DEFAULT 'ALL',
        "recipientCount" integer NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'SENT',
        "createdBy" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_broadcasts_id" PRIMARY KEY ("id")
      )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "broadcasts"`);
  }
}
