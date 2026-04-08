import { execSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL ?? '';
const allowDbPushOnBuild = process.env.ALLOW_DB_PUSH_ON_BUILD === 'true';

function shouldPushSchema(url) {
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

try {
  if (allowDbPushOnBuild && shouldPushSchema(databaseUrl)) {
    console.log('[ensure-db-schema] ALLOW_DB_PUSH_ON_BUILD=true, running prisma db push...');
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: process.env,
    });
  } else {
    console.log('[ensure-db-schema] Skipping prisma db push on build (safe default).');
  }

  // Vercel build may reuse cached node_modules containing an older generated Prisma client.
  // Run generate explicitly so TypeScript types match the current Prisma schema.
  console.log('[ensure-db-schema] Generating Prisma client...');
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: process.env,
  });
} catch (error) {
  console.error('[ensure-db-schema] Failed to sync Prisma schema before build.');
  throw error;
}
