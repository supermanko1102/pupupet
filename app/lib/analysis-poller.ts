import type { AnalysisResult } from '@/components/photo-analysis-modal';
import { PollingController } from '@/lib/polling-controller';
import {
  createCompletedAnalysisResult,
  type PolledAnalysisLog,
} from '@/lib/photo-analysis-result';

export type AnalysisPollerDeps = {
  fetchLogStatus: (logId: string) => Promise<{
    data: PolledAnalysisLog | null;
    error: { message: string } | null;
  }>;
  createSignedUrl: (imagePath: string) => Promise<string | null>;
};

export type PollOutcome =
  /** request still in-flight or status not yet terminal — keep polling */
  | { kind: 'pending' }
  /** previous request hasn't finished yet — skip this tick */
  | { kind: 'skipped' }
  /** total elapsed time exceeded timeoutMs */
  | { kind: 'timeout' }
  /** consecutive errors hit the threshold; fatal */
  | { kind: 'fatal-error'; cause: 'query-error' | 'exception' }
  /** log status reached `done` or `failed`; analysis result is ready */
  | { kind: 'completed'; result: AnalysisResult; logId: string };

export type PollAnalysisArgs = {
  controller: PollingController<unknown>;
  deps: AnalysisPollerDeps;
  imagePath: string;
  logId: string;
  now?: number;
  previewUri: string;
};

/**
 * One iteration of the analysis polling loop. Pure async function: returns an
 * outcome describing what the caller should do (keep polling, stop, render
 * result, etc.). Wraps a `PollingController` for in-flight + error + timeout
 * bookkeeping so the caller never has to touch those internals directly.
 */
export async function pollAnalysisOnce({
  controller,
  deps,
  imagePath,
  logId,
  now,
  previewUri,
}: PollAnalysisArgs): Promise<PollOutcome> {
  if (!controller.beginRequest()) {
    return { kind: 'skipped' };
  }

  if (controller.hasTimedOut(now)) {
    controller.endRequest();
    return { kind: 'timeout' };
  }

  try {
    const { data, error } = await deps.fetchLogStatus(logId);

    if (error) {
      const fatal = controller.recordError();
      return fatal ? { kind: 'fatal-error', cause: 'query-error' } : { kind: 'pending' };
    }

    controller.resetErrors();

    if (data?.status === 'done' || data?.status === 'failed') {
      const signedUrl = await deps.createSignedUrl(imagePath);
      const result = createCompletedAnalysisResult(data, signedUrl ?? previewUri);
      return { kind: 'completed', logId, result };
    }

    return { kind: 'pending' };
  } catch {
    const fatal = controller.recordError();
    return fatal ? { kind: 'fatal-error', cause: 'exception' } : { kind: 'pending' };
  } finally {
    controller.endRequest();
  }
}
