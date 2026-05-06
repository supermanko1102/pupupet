import { supabase } from '@/lib/supabase';

type CreatedAnalysisLog = {
  current_period_end: string | null;
  free_analysis_remaining: number;
  image_path: string;
  is_subscribed: boolean;
  log_id: string;
  subscription_analysis_remaining: number;
  usage_source: 'free' | 'subscription';
};

type CreateAnalysisResponse = {
  log: CreatedAnalysisLog;
};

type FunctionErrorBody = {
  code?: string;
  error?: string;
};

async function readFunctionError(error: unknown) {
  const context = error && typeof error === 'object' && 'context' in error
    ? (error as { context?: unknown }).context
    : null;

  if (typeof Response !== 'undefined' && context instanceof Response) {
    const body = await context.clone().json().catch(() => null) as FunctionErrorBody | null;

    if (body?.code === 'quota_exceeded') {
      return new Error('免費分析次數已用完，訂閱 PupuPet Plus 後即可繼續使用。');
    }

    if (body?.error) {
      return new Error(body.error);
    }
  }

  return error instanceof Error ? error : new Error('建立分析紀錄失敗。');
}

export async function createAnalysisLog(imagePath: string) {
  if (!supabase) {
    throw new Error('Supabase 尚未設定完成。');
  }

  const { data, error } = await supabase.functions.invoke<CreateAnalysisResponse>('create-analysis-log', {
    body: { imagePath },
  });

  if (error) {
    throw await readFunctionError(error);
  }

  if (!data?.log?.log_id) {
    throw new Error('建立分析紀錄失敗。');
  }

  return data.log;
}
