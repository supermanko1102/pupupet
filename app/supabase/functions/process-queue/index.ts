// process-queue: 排程 worker，批次處理所有待分析的 poop_logs
// 呼叫方式：
//   1. pg_cron 定期 POST（見下方 SQL）
//   2. 也可從 Dashboard 手動觸發
//
// pg_cron 設定（在 Supabase SQL Editor 執行）：
//   select cron.schedule(
//     'process-poop-queue',
//     '* * * * *',   -- 每分鐘
//     $$
//       select net.http_post(
//         url     := 'https://<project-ref>.supabase.co/functions/v1/process-queue',
//         headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//       );
//     $$
//   );
//
// 移除：select cron.unschedule('process-poop-queue');

import { processOneJob } from '../analyze-poop/index.ts';

const MAX_JOBS_PER_RUN = 10; // 每次最多處理幾筆，避免單次執行超時

Deno.serve(async (_req) => {
  const results: Array<{ id?: string; skipped?: boolean; error?: string }> = [];

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    try {
      const result = await processOneJob();
      results.push(result);

      // 沒有更多 job 了，提早結束
      if (result.skipped) break;
    } catch (err) {
      results.push({ error: String(err) });
      // 繼續處理下一筆，不因單筆失敗而停止
    }
  }

  const processed = results.filter((r) => r.id).length;
  const failed = results.filter((r) => r.error).length;

  console.log(`process-queue done: processed=${processed}, failed=${failed}`);

  return new Response(
    JSON.stringify({ processed, failed, results }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
