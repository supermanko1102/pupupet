import type { AnalysisResult } from '@/components/photo-analysis-modal';
import type { Database } from '@/types/database';

type PoopLogRow = Database['public']['Tables']['poop_logs']['Row'];
type RiskLevel = PoopLogRow['risk_level'];
export type AnalysisFailureReason = 'not_poop' | 'unclear' | 'system_error';

export type PolledAnalysisLog = Pick<
  PoopLogRow,
  'bristol_score' | 'failure_reason' | 'recommendation' | 'risk_level' | 'status' | 'summary'
>;

export function createPollingFailureResult(
  summary: string,
  previewUri: string,
  recommendation: string | null = '你可以先離開此畫面，稍後到歷程查看是否完成分析。',
  failureReason: AnalysisFailureReason = 'system_error'
): AnalysisResult {
  return {
    imageUrl: previewUri,
    bristolScore: null,
    failed: true,
    failureReason,
    recommendation,
    riskLevel: null,
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
    imageUrl,
    bristolScore: log.bristol_score,
    failed,
    failureReason: failed ? failureReason : null,
    recommendation: failed ? null : log.recommendation,
    riskLevel: failed ? null : log.risk_level,
    summary: failed ? (log.summary ?? failureSummary(failureReason)) : log.summary,
  };
}

export function shouldScheduleAnalysisFollowUp(riskLevel: RiskLevel) {
  return riskLevel === 'vet' || riskLevel === 'observe';
}

function normalizeFailureReason(value: string | null | undefined): AnalysisFailureReason {
  if (value === 'not_poop' || value === 'unclear' || value === 'system_error') return value;
  return 'system_error';
}

function failureSummary(reason: AnalysisFailureReason) {
  if (reason === 'not_poop') return '這張照片無法分析。';
  if (reason === 'unclear') return '照片不夠清楚。';
  return '暫時無法完成分析。';
}
