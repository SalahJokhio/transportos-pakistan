import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiFeedback1786200000000 implements MigrationInterface {
  name = 'AiFeedback1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "ai_feedback" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying,
        "kind" character varying NOT NULL,
        "refId" character varying,
        "accepted" boolean NOT NULL,
        "note" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_feedback_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_feedback_kind_created" ON "ai_feedback" ("kind", "createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ai_feedback"`);
  }
}
