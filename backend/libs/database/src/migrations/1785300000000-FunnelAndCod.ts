import { MigrationInterface, QueryRunner } from 'typeorm';

export class FunnelAndCod1785300000000 implements MigrationInterface {
  name = 'FunnelAndCod1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "paymentMode" character varying NOT NULL DEFAULT 'ONLINE'`);
    await queryRunner.query(`
      CREATE TABLE "funnel_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stage" character varying NOT NULL,
        "sessionId" character varying,
        "tripId" character varying,
        "userId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_funnel_events_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_funnel_events_stage" ON "funnel_events" ("stage")`);
    await queryRunner.query(`CREATE INDEX "IDX_funnel_events_createdAt" ON "funnel_events" ("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "funnel_events"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "paymentMode"`);
  }
}
