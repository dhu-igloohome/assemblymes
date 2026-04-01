import { execSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL ?? '';

function shouldPushSchema(url) {
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

if (!shouldPushSchema(databaseUrl)) {
  console.log('[ensure-db-schema] Skipping prisma db push for non-Postgres deploy environment.');
  process.exit(0);
}

try {
  console.log('[ensure-db-schema] Running prisma db push...');
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: process.env,
  });
} catch (error) {
  console.error('[ensure-db-schema] Failed to sync Prisma schema before build.');
  throw error;
}
