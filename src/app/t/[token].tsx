import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Timeline } from '@/components/timeline';
import { Body, Card, ErrorText, Row, Screen } from '@/components/ui';
import { tzs } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Tracking } from '@/lib/types';
import { must, useLoad } from '@/lib/use-async';

// Public page opened from the link in the customer's SMS. No sign-in.
export default function Track() {
  const c = useColors();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data, error, loading, reload } = useLoad(async () => must(await supabase.rpc('track_parcel', { p_token: token })) as Tracking | null, token);

  return (
    <Screen title={data ? `Hi ${data.customer_first_name}` : 'Track your parcel'} subtitle={data ? `${data.code} from ${data.shop}` : 'Pikii'} refreshing={loading} onRefresh={reload}>
      <ErrorText>{error}</ErrorText>
      {!loading && !data && !error ? <Body>We could not find this parcel. Check that you opened the full link from your Pikii SMS.</Body> : null}
      {data ? (
        <>
          {data.collection_code ? (
            <Card>
              <Body muted>Show this code at {data.agent_host}</Body>
              <Text style={{ color: c.ink, fontSize: 34, fontFamily: 'monospace', letterSpacing: 4 }}>{data.collection_code}</Text>
              <Body muted>
                {data.agent_place} · open {data.opening_hours} · collect within 3 days
              </Body>
              {data.fee_due_tzs ? (
                <Row>
                  <Text style={{ color: c.ink, fontWeight: '700' }}>Pay at the agent</Text>
                  <Text style={{ color: c.ink, fontWeight: '700' }}>{tzs(data.fee_due_tzs)}</Text>
                </Row>
              ) : null}
            </Card>
          ) : null}
          <Card>
            <Timeline events={data.events ?? []} current={data.status} agentPlace={data.agent_place} agentHost={data.agent_host} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
