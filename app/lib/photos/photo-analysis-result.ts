import type { AnalysisResult } from '@/components/photo-analysis-modal';
import type { Database } from '@/types/database';

type PoopLogRow = Database['public']['Tables']['poop_logs']['Row'];
type RiskLevel = PoopLogRow['risk_level'];

export type PolledAnalysisLog = Pick<
  PoopLogRow,
  'bristol_score' | 'recommendation' | 'risk_level' | 'status' | 'summary'
>;

export function createPollingFailureResult(
  summary: string,
  previewUri: string,
  recommendation: string | null = '你可以先離開此畫面，稍後到歷程查看是否完成分析。'
): AnalysisResult {
  return {
    imageUrl: previewUri,
    bristolScore: null,
    failed: true,
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

  return {
    imageUrl,
    bristolScore: log.bristol_score,
    failed,
    recommendation: failed ? null : log.recommendation,
    riskLevel: failed ? null : log.risk_level,
    summary: failed ? '分析失敗，請重新拍照。' : log.summary,
  };
}

export function shouldScheduleAnalysisFollowUp(riskLevel: RiskLevel) {
  return riskLevel === 'vet' || riskLevel === 'observe';
}
