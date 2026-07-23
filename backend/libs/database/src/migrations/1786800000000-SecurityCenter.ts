import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecurityCenter1786800000000 implements MigrationInterface {
  name = 'SecurityCenter1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecret" character varying`);
    await queryRunner.query(`
      CREATE TABLE "login_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'SUCCESS',
        "ip" character varying,
        "device" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_login_history_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_login_history_user" ON "login_history" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "login_history"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorSecret"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorEnabled"`);
  }
}
