import { describe, expect, it } from 'vitest';

import {
  PolledAnalysisLog,
  createCompletedAnalysisResult,
  createPollingFailureResult,
  shouldScheduleAnalysisFollowUp,
} from '@/lib/photos/photo-analysis-result';

const completedLog: PolledAnalysisLog = {
  bristol_score: 4,
  failure_reason: null,
  recommendation: 'Keep monitoring hydration.',
  risk_level: 'normal',
  status: 'done',
  summary: 'Looks normal.',
};

describe('photo analysis result helpers', () => {
  it('creates a normal completed analysis result', () => {
    expect(createCompletedAnalysisResult(completedLog, 'signed-url')).toEqual({
      bristolScore: 4,
      failureReason: null,
      failed: false,
      imageUrl: 'signed-url',
      recommendation: 'Keep monitoring hydration.',
      riskLevel: 'normal',
      summary: 'Looks normal.',
    });
  });

  it('normalizes failed analysis results for the modal', () => {
    expect(createCompletedAnalysisResult({
      ...completedLog,
      failure_reason: 'not_poop',
      recommendation: 'ignored',
      risk_level: 'vet',
      status: 'failed',
      summary: 'ignored',
    }, 'preview-url')).toEqual({
      bristolScore: 4,
      failureReason: 'not_poop',
      failed: true,
      imageUrl: 'preview-url',
      recommendation: null,
      riskLevel: null,
      summary: 'ignored',
    });
  });

  it('creates polling failure results with the default recommendation', () => {
    expect(createPollingFailureResult('分析時間較長，稍後可在歷程查看結果。', 'preview-url')).toEqual({
      bristolScore: null,
      failureReason: 'system_error',
      failed: true,
      imageUrl: 'preview-url',
      recommendation: '你可以先離開此畫面，稍後到歷程查看是否完成分析。',
      riskLevel: null,
      summary: '分析時間較長，稍後可在歷程查看結果。',
    });
  });

  it('only schedules follow-up for observe or vet risk levels', () => {
    expect(shouldScheduleAnalysisFollowUp('observe')).toBe(true);
    expect(shouldScheduleAnalysisFollowUp('vet')).toBe(true);
    expect(shouldScheduleAnalysisFollowUp('normal')).toBe(false);
    expect(shouldScheduleAnalysisFollowUp(null)).toBe(false);
  });
});
