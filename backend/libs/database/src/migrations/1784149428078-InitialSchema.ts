import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784149428078 implements MigrationInterface {
    name = 'InitialSchema1784149428078'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // uuid_generate_v4() (used by every table's PK default) lives in this
        // extension. A fresh Postgres won't have it, so create it up front.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "wallet_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "type" character varying NOT NULL, "amount" numeric(10,2) NOT NULL, "balanceAfter" numeric(10,2) NOT NULL, "description" character varying, "bookingId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_69454773f1e666a14c6a953935" ON "wallet_transactions" ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('PASSENGER', 'BOOKING_AGENT', 'COMPANY_ADMIN', 'COMPANY_MANAGER', 'DRIVER', 'FLEET_MANAGER', 'CALL_CENTER_AGENT', 'FINANCE_OFFICER', 'SUPER_ADMIN', 'FRANCHISE_PARTNER', 'CARGO_OPERATOR', 'AIRLINE_OPERATOR', 'RAILWAY_OPERATOR')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying, "lastName" character varying, "email" character varying, "phone" character varying NOT NULL, "password" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'PASSENGER', "cnic" character varying, "profilePhoto" character varying, "isPhoneVerified" boolean NOT NULL DEFAULT false, "isEmailVerified" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP, "loyaltyPoints" integer NOT NULL DEFAULT '0', "walletBalance" numeric(10,2) NOT NULL DEFAULT '0', "companyId" character varying, "preferences" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a000cca60bcf04454e72769949" ON "users" ("phone") `);
        await queryRunner.query(`CREATE TABLE "otps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "identifier" character varying NOT NULL, "code" character varying NOT NULL, "purpose" character varying NOT NULL, "isUsed" boolean NOT NULL DEFAULT false, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_91fef5ed60605b854a2115d2410" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f015ce81084e256f3cdda78088" ON "otps" ("identifier") `);
        await queryRunner.query(`CREATE TYPE "public"."loyalty_transactions_type_enum" AS ENUM('EARN', 'REDEEM', 'EXPIRE', 'BONUS', 'REFUND')`);
        await queryRunner.query(`CREATE TABLE "loyalty_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "type" "public"."loyalty_transactions_type_enum" NOT NULL, "points" integer NOT NULL, "balanceAfter" integer NOT NULL, "bookingId" character varying, "description" character varying, "expiresAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_df453f678b7575221b335673362" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3288a03633857ba5656cff32dc" ON "loyalty_transactions" ("userId") `);
        await queryRunner.query(`CREATE TABLE "disputes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "userName" character varying, "bookingId" character varying, "pnr" character varying, "type" character varying NOT NULL, "subject" character varying NOT NULL, "description" text, "status" character varying NOT NULL DEFAULT 'OPEN', "resolution" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3c97580d01c1a4b0b345c42a107" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f49c7610167b5a0754f72ab5e3" ON "disputes" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0ea46f4f2225f38d127063c367" ON "disputes" ("status") `);
        await queryRunner.query(`CREATE TABLE "gps_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tripId" character varying NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "speed" double precision, "heading" double precision, "recordedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bf5a0a9cc743b0fb9b4a5bd70b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_gps_trip_time" ON "gps_logs" ("tripId", "recordedAt") `);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingId" character varying NOT NULL, "provider" character varying NOT NULL, "amount" numeric(10,2) NOT NULL, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING', "refundedAmount" numeric(10,2) NOT NULL DEFAULT '0', "providerRef" character varying, "idempotencyKey" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1ead3dc5d71db0ea822706e389" ON "payments" ("bookingId") `);
        await queryRunner.query(`CREATE INDEX "IDX_684d092a3d90f53057424fc1ec" ON "payments" ("providerRef") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_743b9fb1d2a059f2f7860418e4" ON "payments" ("idempotencyKey") `);
        await queryRunner.query(`CREATE TYPE "public"."trips_status_enum" AS ENUM('SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED', 'CANCELLED', 'DELAYED')`);
        await queryRunner.query(`CREATE TABLE "trips" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "routeId" character varying NOT NULL, "busId" character varying NOT NULL, "companyId" character varying NOT NULL, "driverId" character varying NOT NULL, "departureTime" TIMESTAMP NOT NULL, "estimatedArrivalTime" TIMESTAMP NOT NULL, "actualDepartureTime" TIMESTAMP, "actualArrivalTime" TIMESTAMP, "status" "public"."trips_status_enum" NOT NULL DEFAULT 'SCHEDULED', "basePrice" numeric(10,2) NOT NULL, "seatAvailability" jsonb NOT NULL DEFAULT '{}', "delayMinutes" integer, "delayReason" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f71c231dee9c05a9522f9e840f5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "trip_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tripId" character varying NOT NULL, "driverId" character varying NOT NULL, "busId" character varying, "companyId" character varying, "type" character varying NOT NULL, "category" character varying, "description" text, "amount" numeric(10,2) NOT NULL DEFAULT '0', "litres" numeric(8,2), "mediaUrls" jsonb NOT NULL DEFAULT '[]', "lat" double precision, "lng" double precision, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8213ea91a96ecb7e18d0d78d7ec" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_08d5f0370c345906df89de694a" ON "trip_reports" ("tripId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2d250478108c901a96570bbcc8" ON "trip_reports" ("driverId") `);
        await queryRunner.query(`CREATE INDEX "IDX_027d7a149126c2d0285f5a8369" ON "trip_reports" ("busId") `);
        await queryRunner.query(`CREATE INDEX "IDX_75b2a492e6ed9d216ca2214057" ON "trip_reports" ("companyId") `);
        await queryRunner.query(`CREATE TYPE "public"."routes_transporttype_enum" AS ENUM('BUS', 'TRAIN', 'AIRLINE', 'FERRY')`);
        await queryRunner.query(`CREATE TABLE "routes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "originCity" character varying NOT NULL, "destinationCity" character varying NOT NULL, "distanceKm" numeric(10,2) NOT NULL, "estimatedMinutes" integer NOT NULL, "stops" jsonb NOT NULL DEFAULT '[]', "transportType" "public"."routes_transporttype_enum" NOT NULL DEFAULT 'BUS', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."employees_employeetype_enum" AS ENUM('DRIVER', 'CONDUCTOR', 'MECHANIC', 'TECHNICIAN', 'BOOKING_AGENT', 'TERMINAL_MANAGER', 'CLEANER', 'SECURITY', 'ACCOUNTANT', 'DISPATCHER')`);
        await queryRunner.query(`CREATE TYPE "public"."employees_status_enum" AS ENUM('ON_DUTY', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" character varying NOT NULL, "employeeType" "public"."employees_employeetype_enum" NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying, "cnic" character varying, "phone" character varying, "address" character varying, "nextOfKin" character varying, "depot" character varying, "joinDate" date, "salary" numeric(10,2) NOT NULL DEFAULT '0', "status" "public"."employees_status_enum" NOT NULL DEFAULT 'ON_DUTY', "photoUrl" character varying, "documents" jsonb, "rating" double precision NOT NULL DEFAULT '0', "userId" character varying, "notes" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c7b030a4514a003d9d8d31a812" ON "employees" ("companyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_79b407bc618fb44bd242308464" ON "employees" ("cnic") `);
        await queryRunner.query(`CREATE INDEX "IDX_6c2d3d1c524df12d2976b8d43e" ON "employees" ("companyId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_356b468150d8e425bc5372a82f" ON "employees" ("companyId", "employeeType") `);
        await queryRunner.query(`CREATE TABLE "driver_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "driverId" character varying NOT NULL, "byUserId" character varying, "byName" character varying, "rating" integer NOT NULL, "remark" text, "tripId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0c4ce282b727c6e8b7806110ddd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2dfa6660fa44a1a939e5b781f3" ON "driver_reviews" ("driverId") `);
        await queryRunner.query(`CREATE TYPE "public"."buses_bustype_enum" AS ENUM('AC', 'NON_AC', 'SLEEPER', 'BUSINESS', 'MINIBUS')`);
        await queryRunner.query(`CREATE TABLE "buses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "registrationNumber" character varying NOT NULL, "companyId" character varying NOT NULL, "busType" "public"."buses_bustype_enum" NOT NULL DEFAULT 'AC', "make" character varying NOT NULL, "model" character varying NOT NULL, "manufacturingYear" integer NOT NULL, "totalSeats" integer NOT NULL, "seatLayout" jsonb NOT NULL, "amenities" character varying, "isActive" boolean NOT NULL DEFAULT true, "currentDriverId" character varying, "lastMaintenanceDate" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ddebc0eeba64a019ae072975947" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum" AS ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'COMPLETED', 'NO_SHOW')`);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pnr" character varying NOT NULL, "tripId" character varying NOT NULL, "passengerId" character varying NOT NULL, "bookedById" character varying, "seatNumbers" text array NOT NULL, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT', "totalAmount" numeric(10,2) NOT NULL, "discountAmount" numeric(10,2) NOT NULL DEFAULT '0', "finalAmount" numeric(10,2) NOT NULL, "paymentId" character varying, "cancellationReason" character varying, "cancelledAt" TIMESTAMP, "passengerDetails" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5284b2f2251fc932370aa41d13" ON "bookings" ("pnr") `);
        await queryRunner.query(`CREATE TABLE "booking_seats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tripId" character varying NOT NULL, "seatNumber" character varying NOT NULL, "bookingId" character varying NOT NULL, "passengerId" character varying, "gender" character varying(1), "status" character varying NOT NULL DEFAULT 'HELD', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a4d929dea33a0153ba9bc253db1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6e2ae3151c0c6334b1aae0dcef" ON "booking_seats" ("tripId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7efd3a3e653dcc3cfa9ce09a88" ON "booking_seats" ("bookingId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_confirmed_seat" ON "booking_seats" ("tripId", "seatNumber") WHERE "status" = 'CONFIRMED'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uq_confirmed_seat"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7efd3a3e653dcc3cfa9ce09a88"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6e2ae3151c0c6334b1aae0dcef"`);
        await queryRunner.query(`DROP TABLE "booking_seats"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5284b2f2251fc932370aa41d13"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
        await queryRunner.query(`DROP TABLE "buses"`);
        await queryRunner.query(`DROP TYPE "public"."buses_bustype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2dfa6660fa44a1a939e5b781f3"`);
        await queryRunner.query(`DROP TABLE "driver_reviews"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_356b468150d8e425bc5372a82f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6c2d3d1c524df12d2976b8d43e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_79b407bc618fb44bd242308464"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7b030a4514a003d9d8d31a812"`);
        await queryRunner.query(`DROP TABLE "employees"`);
        await queryRunner.query(`DROP TYPE "public"."employees_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."employees_employeetype_enum"`);
        await queryRunner.query(`DROP TABLE "routes"`);
        await queryRunner.query(`DROP TYPE "public"."routes_transporttype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_75b2a492e6ed9d216ca2214057"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_027d7a149126c2d0285f5a8369"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2d250478108c901a96570bbcc8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_08d5f0370c345906df89de694a"`);
        await queryRunner.query(`DROP TABLE "trip_reports"`);
        await queryRunner.query(`DROP TABLE "trips"`);
        await queryRunner.query(`DROP TYPE "public"."trips_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_743b9fb1d2a059f2f7860418e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_684d092a3d90f53057424fc1ec"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1ead3dc5d71db0ea822706e389"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_gps_trip_time"`);
        await queryRunner.query(`DROP TABLE "gps_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ea46f4f2225f38d127063c367"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f49c7610167b5a0754f72ab5e3"`);
        await queryRunner.query(`DROP TABLE "disputes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3288a03633857ba5656cff32dc"`);
        await queryRunner.query(`DROP TABLE "loyalty_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."loyalty_transactions_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f015ce81084e256f3cdda78088"`);
        await queryRunner.query(`DROP TABLE "otps"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a000cca60bcf04454e72769949"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_69454773f1e666a14c6a953935"`);
        await queryRunner.query(`DROP TABLE "wallet_transactions"`);
    }

}
