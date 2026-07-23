import { MigrationInterface, QueryRunner } from 'typeorm';

export class InboxNotifications1786400000000 implements MigrationInterface {
  name = 'InboxNotifications1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "inbox_notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "body" text,
        "type" character varying NOT NULL DEFAULT 'info',
        "link" character varying,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inbox_notifications_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_inbox_user_read" ON "inbox_notifications" ("userId", "isRead")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "inbox_notifications"`);
  }
}
