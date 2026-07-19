import { MigrationInterface, QueryRunner } from 'typeorm';

export class Parcels1785100000000 implements MigrationInterface {
  name = 'Parcels1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "parcels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trackingNo" character varying NOT NULL,
        "senderName" character varying NOT NULL,
        "senderPhone" character varying,
        "receiverName" character varying NOT NULL,
        "receiverPhone" character varying,
        "originCity" character varying NOT NULL,
        "destinationCity" character varying NOT NULL,
        "weightKg" numeric(8,2) NOT NULL DEFAULT 0,
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'BOOKED',
        "companyId" character varying,
        "tripId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_parcels_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_parcels_trackingNo" ON "parcels" ("trackingNo")`);
    await queryRunner.query(`CREATE INDEX "IDX_parcels_status" ON "parcels" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "parcels"`);
  }
}
