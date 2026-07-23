import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgeBase1786100000000 implements MigrationInterface {
  name = 'KnowledgeBase1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "kb_articles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" character varying,
        "title" character varying NOT NULL,
        "category" character varying NOT NULL DEFAULT 'SOP',
        "body" text NOT NULL,
        "tags" jsonb NOT NULL DEFAULT '[]',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kb_articles_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_kb_company_category" ON "kb_articles" ("companyId", "category")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "kb_articles"`);
  }
}
