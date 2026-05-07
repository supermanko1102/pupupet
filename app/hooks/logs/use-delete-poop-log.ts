import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelFollowUp } from '@/lib/notifications';
import { useSession } from '@/providers/session-provider';
import { deletePoopLog, poopLogsKeys } from './shared';

export function useDeletePoopLog() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async (logId: string) => {
      await deletePoopLog(logId);
      await cancelFollowUp(logId).catch((error) => {
        console.warn('Failed to cancel follow-up notification after deleting log:', error);
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: poopLogsKeys.all(user?.id) });
    },
  });
}
