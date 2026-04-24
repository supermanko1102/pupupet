import { useCallback, useState } from 'react';

import type { DetailLog } from '@/components/log-detail-modal';

export function useLogDetailFlow() {
  const [detailLog, setDetailLog] = useState<DetailLog | null>(null);
  const [isFollowUp, setIsFollowUp] = useState(false);

  const openLogDetail = useCallback((log: DetailLog, options?: { isFollowUp?: boolean }) => {
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
