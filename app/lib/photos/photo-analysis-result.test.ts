import { describe, expect, it } from 'vitest';

import {
  PolledAnalysisLog,
  createCompletedAnalysisResult,
  createPollingFailureResult,
} from '@/lib/photos/photo-analysis-result';

const completedLog: PolledAnalysisLog = {
  ai_escalation_signs: ['若持續水便可聯絡獸醫'],
  ai_findings: ['顏色棕色', '形狀成形'],
  ai_next_step: '接下來 1-2 次排便可以再觀察。',
  ai_observation: '照片中看起來成形，顏色偏棕。',
  ai_possible_reasons: ['日常飲食造成的顏色差異'],
  ai_watch_items: ['留意是否變稀'],
  bristol_score: 4,
  failure_reason: null,
  recommendation: 'Keep monitoring hydration.',
  status: 'done',
  summary: 'Looks normal.',
};

describe('photo analysis result helpers', () => {
  it('creates a normal completed analysis result', () => {
    expect(createCompletedAnalysisResult(completedLog, 'signed-url')).toEqual({
      aiEscalationSigns: ['若持續水便可聯絡獸醫'],
      aiFindings: ['顏色棕色', '形狀成形'],
      aiNextStep: '接下來 1-2 次排便可以再觀察。',
      aiObservation: '照片中看起來成形，顏色偏棕。',
      aiPossibleReasons: ['日常飲食造成的顏色差異'],
      aiWatchItems: ['留意是否變稀'],
      bristolScore: 4,
      failureReason: null,
      failed: false,
      imageUrl: 'signed-url',
      recommendation: 'Keep monitoring hydration.',
      summary: 'Looks normal.',
    });
  });

  it('normalizes failed analysis results for the modal', () => {
    expect(createCompletedAnalysisResult({
      ...completedLog,
      failure_reason: 'not_poop',
      recommendation: 'ignored',
      status: 'failed',
      summary: 'ignored',
    }, 'preview-url')).toEqual({
      aiEscalationSigns: [],
      aiFindings: [],
      aiNextStep: null,
      aiObservation: null,
      aiPossibleReasons: [],
      aiWatchItems: [],
      bristolScore: 4,
      failureReason: 'not_poop',
      failed: true,
      imageUrl: 'preview-url',
      recommendation: null,
      summary: 'ignored',
    });
  });

  it('creates polling failure results with the default recommendation', () => {
    expect(createPollingFailureResult('分析時間較長，稍後可在歷程查看結果。', 'preview-url')).toEqual({
      aiEscalationSigns: [],
      aiFindings: [],
      aiNextStep: null,
      aiObservation: null,
      aiPossibleReasons: [],
      aiWatchItems: [],
      bristolScore: null,
      failureReason: 'system_error',
      failed: true,
      imageUrl: 'preview-url',
      recommendation: '你可以先離開此畫面，稍後到歷程查看是否完成分析。',
      summary: '分析時間較長，稍後可在歷程查看結果。',
    });
  });
});
