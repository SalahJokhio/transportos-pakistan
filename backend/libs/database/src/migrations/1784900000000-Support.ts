import { MigrationInterface, QueryRunner } from 'typeorm';

export class Support1784900000000 implements MigrationInterface {
  name = 'Support1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "support_tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subject" character varying NOT NULL,
        "category" character varying,
        "priority" character varying NOT NULL DEFAULT 'MEDIUM',
        "status" character varying NOT NULL DEFAULT 'OPEN',
        "requesterId" character varying,
        "requesterName" character varying,
        "requesterPhone" character varying,
        "assignedTo" character varying,
        "firstResponseAt" TIMESTAMP,
        "resolvedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_support_tickets_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_support_tickets_status" ON "support_tickets" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "support_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticketId" character varying NOT NULL,
        "authorId" character varying,
        "authorRole" character varying,
        "body" text NOT NULL,
        "isInternal" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_support_messages_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_support_messages_ticketId" ON "support_messages" ("ticketId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "support_messages"`);
    await queryRunner.query(`DROP TABLE "support_tickets"`);
  }
}
