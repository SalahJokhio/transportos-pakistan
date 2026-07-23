import { MigrationInterface, QueryRunner } from 'typeorm';

export class TicketCsat1786500000000 implements MigrationInterface {
  name = 'TicketCsat1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "rating" integer`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "ratingComment" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "ratingComment"`);
    await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "rating"`);
  }
}
