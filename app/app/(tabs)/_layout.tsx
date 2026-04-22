import { Redirect, Slot } from 'expo-router';

import { useSession } from '@/providers/session-provider';

export default function AppLayout() {
  const { isReady, user } = useSession();

  if (isReady && !user) {
    return <Redirect href={'/sign-in' as never} />;
  }

  return <Slot />;
}
