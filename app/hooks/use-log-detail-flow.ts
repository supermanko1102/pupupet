import { useCallback, useState } from 'react';

import type { HistoryLog } from '@/hooks/use-poop-logs';

export function useLogDetailFlow() {
  const [detailLog, setDetailLog] = useState<HistoryLog | null>(null);
  const [isFollowUp, setIsFollowUp] = useState(false);

  const openLogDetail = useCallback((log: HistoryLog, options?: { isFollowUp?: boolean }) => {
    setDetailLog(log);
    setIsFollowUp(!!options?.isFollowUp);
  }, []);

  const closeLogDetail = useCallback(() => {
    setDetailLog(null);
    setIsFollowUp(false);
  }, []);

  return {
    closeLogDetail,
    detailLog,
    isFollowUp,
    openLogDetail,
  };
}
