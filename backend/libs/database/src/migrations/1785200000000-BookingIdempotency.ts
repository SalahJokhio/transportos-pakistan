import { MigrationInterface, QueryRunner } from 'typeorm';

export class BookingIdempotency1785200000000 implements MigrationInterface {
  name = 'BookingIdempotency1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "idempotencyKey" character varying`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bookings_idempotencyKey" ON "bookings" ("idempotencyKey")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bookings_idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "idempotencyKey"`);
  }
}
