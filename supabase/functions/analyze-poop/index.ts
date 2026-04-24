import { processOneJob, toErrorMessage } from '../_shared/poop-analysis.ts';

// Webhook 觸發後，透過 claim_poop_job() 原子性搶一筆 job。
// 避免多個 Edge Function instance 同時處理同一筆記錄。
Deno.serve(async (_req) => {
  try {
    const result = await processOneJob();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('analyze-poop error:', error);
    return new Response(JSON.stringify({ error: toErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
