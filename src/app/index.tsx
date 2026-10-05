import { Redirect } from 'expo-router';

import { Body, Button, Card, Loading, Screen } from '@/components/ui';
import { useSession } from '@/lib/session';
import { isConfigured } from '@/lib/supabase';

// Sends each person to the screens for their role.
export default function Home() {
  const { loading, session, profile, profileError, signOut } = useSession();

  if (!isConfigured) {
    return (
      <Screen title="Pikii" subtitle="Setup needed">
        <Card>
          <Body>
            This build has no server set. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env file and
            restart. The README explains where to find them.
          </Body>
        </Card>
      </Screen>
    );
  }
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (!profile) {
    return (
      <Screen title="Pikii" subtitle="Account not ready">
        <Card>
          <Body>{profileError}</Body>
        </Card>
        <Button label="Sign out" variant="ghost" onPress={signOut} />
      </Screen>
    );
  }
  return <Redirect href={`/${profile.role}`} />;
}
