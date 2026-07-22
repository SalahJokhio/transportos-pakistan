import { MigrationInterface, QueryRunner } from 'typeorm';

export class ComplianceDocuments1784600000000 implements MigrationInterface {
  name = 'ComplianceDocuments1784600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "compliance_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ownerType" character varying NOT NULL,
        "ownerId" character varying NOT NULL,
        "ownerLabel" character varying,
        "docType" character varying NOT NULL,
        "number" character varying,
        "fileUrl" character varying,
        "issuedAt" date,
        "expiresAt" date,
        "status" character varying NOT NULL DEFAULT 'PENDING_REVIEW',
        "notes" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_compliance_documents_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_compliance_owner" ON "compliance_documents" ("ownerType", "ownerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_compliance_expiresAt" ON "compliance_documents" ("expiresAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_compliance_expiresAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_compliance_owner"`);
    await queryRunner.query(`DROP TABLE "compliance_documents"`);
  }
}
