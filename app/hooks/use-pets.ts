import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type Pet = Database['public']['Tables']['pets']['Row'];
type PetInsert = Database['public']['Tables']['pets']['Insert'];
type PetUpdate = Database['public']['Tables']['pets']['Update'];

export const PETS_KEY = 'pets';

export function usePets() {
  const { user } = useSession();

  return useQuery({
    queryKey: [PETS_KEY, user?.id],
    queryFn: async () => {
      if (!supabase || !user) return [];
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pet[];
    },
    enabled: !!user && !!supabase,
  });
}

export function useCreatePet() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async (fields: Omit<PetInsert, 'user_id'>) => {
      if (!supabase) throw new Error('supabase not ready');
      const { data, error } = await supabase.from('pets').insert(fields).select().single();
      if (error) throw error;
      return data as Pet;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PETS_KEY, user?.id] });
    },
  });
}

export function useUpdatePet() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async ({ id, ...fields }: PetUpdate & { id: string }) => {
      if (!supabase) throw new Error('supabase not ready');
      const { error } = await supabase.from('pets').update(fields).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PETS_KEY, user?.id] });
    },
  });
}

export function useDeletePet() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('supabase not ready');
      const { error } = await supabase.from('pets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PETS_KEY, user?.id] });
    },
  });
}

export function useAssignPet() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async ({ logId, petId }: { logId: string; petId: string }) => {
      if (!supabase) throw new Error('supabase not ready');
      const { error } = await supabase.from('poop_logs').update({ pet_id: petId }).eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      // 讓 recent logs 和 history 都失效，下次自動重新 fetch
      void queryClient.invalidateQueries({ queryKey: ['poop_logs', user?.id] });
    },
  });
}
