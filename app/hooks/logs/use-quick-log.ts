import { useMutation, useQueryClient } from '@tanstack/react-query';

import { scheduleAbnormalFollowUp } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { poopLogsKeys } from './shared';
import type { ManualStatus } from './shared';

export type QuickLogInput = {
  manualStatus: NonNullable<ManualStatus>;
  note?: string;
  petId?: string;
};

export function useQuickLog() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: QuickLogInput) => {
      if (!supabase || !user) throw new Error('未登入');

      const { data, error } = await supabase
        .from('poop_logs')
        .insert({
          entry_mode: 'quick_log',
          manual_status: input.manualStatus,
          note: input.note ?? null,
          pet_id: input.petId ?? null,
          status: 'done',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.manualStatus === 'abnormal' || variables.manualStatus === 'soft') {
        void scheduleAbnormalFollowUp(data.id);
      }
      queryClient.invalidateQueries({ queryKey: poopLogsKeys.all(user?.id) });
    },
  });
}
