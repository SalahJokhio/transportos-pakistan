// Bootstrap the first platform admin (out-of-band, privileged).
// Public registration always creates PASSENGERs, so the very first SUPER_ADMIN
// must be promoted directly in the database.
//   node scripts/make-admin.mjs <phone>
import pg from 'pg';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const phone = process.argv[2];
if (!phone) {
  console.error('Usage: node scripts/make-admin.mjs <phone>');
  process.exit(1);
}

const client = new pg.Client({
  host: env.DATABASE_HOST || 'localhost',
  port: Number(env.DATABASE_PORT || 5432),
  user: env.DATABASE_USERNAME || 'postgres',
  password: env.DATABASE_PASSWORD || 'postgres',
  database: env.DATABASE_NAME || 'transport_os',
});

await client.connect();
const res = await client.query(
  `UPDATE users SET role = 'SUPER_ADMIN' WHERE phone = $1 RETURNING id, "firstName", phone, role`,
  [phone],
);
if (res.rowCount === 0) {
  console.error(`No user found with phone ${phone}. Register first, then promote.`);
  process.exitCode = 1;
} else {
  console.log('Promoted to SUPER_ADMIN:', res.rows[0]);
}
await client.end();
