import type { AnalysisResult } from '@/components/photo-analysis-modal';
import type { Database } from '@/types/database';

type PoopLogRow = Database['public']['Tables']['poop_logs']['Row'];
export type AnalysisFailureReason = 'not_poop' | 'unclear' | 'system_error';

export type PolledAnalysisLog = Pick<
  PoopLogRow,
  | 'ai_escalation_signs'
  | 'ai_findings'
  | 'ai_next_step'
  | 'ai_observation'
  | 'ai_possible_reasons'
  | 'ai_watch_items'
  | 'bristol_score'
  | 'failure_reason'
  | 'recommendation'
  | 'status'
  | 'summary'
>;

export function createPollingFailureResult(
  summary: string,
  previewUri: string,
  recommendation: string | null = '你可以先離開此畫面，稍後到歷程查看是否完成分析。',
  failureReason: AnalysisFailureReason = 'system_error'
): AnalysisResult {
  return {
    aiEscalationSigns: [],
    aiFindings: [],
    aiNextStep: null,
    aiObservation: null,
    aiPossibleReasons: [],
    aiWatchItems: [],
    bristolScore: null,
    failed: true,
    failureReason,
    imageUrl: previewUri,
    recommendation,
    summary,
  };
}

export function createCompletedAnalysisResult(
  log: PolledAnalysisLog,
  imageUrl: string
): AnalysisResult {
  const failed = log.status === 'failed';
  const failureReason = normalizeFailureReason(log.failure_reason);

  return {
    aiEscalationSigns: failed ? [] : textArray(log.ai_escalation_signs),
    aiFindings: failed ? [] : textArray(log.ai_findings),
    aiNextStep: failed ? null : (log.ai_next_step ?? log.recommendation ?? null),
    aiObservation: failed ? null : (log.ai_observation ?? log.summary ?? null),
    aiPossibleReasons: failed ? [] : textArray(log.ai_possible_reasons),
    aiWatchItems: failed ? [] : textArray(log.ai_watch_items),
    bristolScore: log.bristol_score,
    failed,
    failureReason: failed ? failureReason : null,
    imageUrl,
    recommendation: failed ? null : (log.recommendation ?? log.ai_next_step ?? null),
    summary: failed
      ? (log.summary ?? failureSummary(failureReason))
      : (log.summary ?? log.ai_observation ?? null),
  };
}

function normalizeFailureReason(value: string | null | undefined): AnalysisFailureReason {
  if (value === 'not_poop' || value === 'unclear' || value === 'system_error') return value;
  return 'system_error';
}

function textArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
}

function failureSummary(reason: AnalysisFailureReason) {
  if (reason === 'not_poop') return '這張照片無法分析。';
  if (reason === 'unclear') return '照片不夠清楚。';
  return '暫時無法完成分析。';
}
