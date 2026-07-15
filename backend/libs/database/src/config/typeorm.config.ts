import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';

// Load .env (does NOT override vars already set in the shell — so
// `DATABASE_NAME=foo npm run migration:run` still wins over the file).
loadEnv();

/**
 * Standalone DataSource for the TypeORM CLI (migration:generate / run / revert).
 * The Nest app uses its own TypeOrmModule config in database.module.ts; this one
 * exists purely so the migration scripts in package.json have a data source to
 * point at. Globs are resolved relative to the process cwd, which is always the
 * `backend/` dir when the npm scripts run.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT || 5432),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'transport_os',
  entities: ['apps/**/*.entity.{ts,js}'],
  migrations: ['libs/database/src/migrations/*.{ts,js}'],
  synchronize: false, // migrations are the source of truth for the CLI
  logging: ['error', 'migration'],
});
