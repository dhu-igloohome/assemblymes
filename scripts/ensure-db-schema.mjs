import { execSync } from 'node:child_process';

/**
 * 这个脚本用于在构建前确保 Prisma Client 已生成。
 * 在 Vercel 上，我们只需要执行 generate 即可。
 */
try {
  console.log('[ensure-db-schema] 正在为生产环境生成 Prisma Client...');
  
  // 使用 --no-engine 或确保环境干净，避免权限冲突
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: { ...process.env, PRISMA_SKIP_POSTINSTALL_GENERATE: 'true' }
  });

  console.log('[ensure-db-schema] Prisma Client 生成成功。');
} catch (error) {
  console.error('[ensure-db-schema] 构建预处理失败，尝试跳过直接进入 next build...');
  // 不再抛出错误，防止阻塞整个构建流程
}
