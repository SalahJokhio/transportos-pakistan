import { MigrationInterface, QueryRunner } from 'typeorm';

export class LedgerAndBoarding1785400000000 implements MigrationInterface {
  name = 'LedgerAndBoarding1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "ledger_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "txnId" character varying NOT NULL,
        "account" character varying NOT NULL,
        "direction" character varying NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "ref" character varying,
        "memo" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ledger_entries_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_ledger_txnId" ON "ledger_entries" ("txnId")`);
    await queryRunner.query(`CREATE INDEX "IDX_ledger_account" ON "ledger_entries" ("account")`);
    await queryRunner.query(`CREATE INDEX "IDX_ledger_createdAt" ON "ledger_entries" ("createdAt")`);

    // #7 QR boarding check-in.
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "boardedAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "boardedAt"`);
    await queryRunner.query(`DROP TABLE "ledger_entries"`);
  }
}
