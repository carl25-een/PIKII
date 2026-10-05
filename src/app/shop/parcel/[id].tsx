import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Body, Button, Card, ErrorText, H2, Row, Screen, StatusPill } from '@/components/ui';
import { Timeline } from '@/components/timeline';
import { loadDirectory } from '@/lib/agents';
import { displayPhone, tzs } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Parcel, ParcelStatus } from '@/lib/types';
import { must, useLoad } from '@/lib/use-async';

export default function ParcelDetail() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useLoad(async () => {
    const [dir, parcel, events] = await Promise.all([
      loadDirectory(),
      supabase.from('parcels').select('*').eq('id', id).single(),
      supabase.from('parcel_events').select('status, created_at').eq('parcel_id', id).order('created_at'),
    ]);
    return {
      dir,
      parcel: must(parcel) as Parcel,
      events: (must(events) as { status: ParcelStatus; created_at: string }[]).map((e) => ({ status: e.status, at: e.created_at })),
    };
  }, id);

  const p = data?.parcel;
  const agent = p ? data?.dir.byId[p.agent_id] : undefined;
  return (
    <Screen title={p?.code ?? 'Parcel'} subtitle={p ? `For ${p.customer_name}` : undefined} refreshing={loading} onRefresh={reload}>
      <ErrorText>{error}</ErrorText>
      {p && agent ? (
        <>
          {p.status === 'booked' ? (
            <Body>Write this code on the parcel, or show this screen, when the Pikii runner collects it.</Body>
          ) : null}
          <Card style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: c.ink }}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <View style={{ backgroundColor: '#fff', padding: 6, borderRadius: 6 }}>
                <QRCode value={p.code} size={96} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: c.ink, fontSize: 22, fontFamily: 'monospace' }}>{p.code}</Text>
                <Text style={{ color: c.ink, fontWeight: '700' }}>{agent.place}</Text>
                <Body muted>{agent.host}</Body>
                <Body muted>
                  {p.customer_name} · {displayPhone(p.customer_phone)}
                </Body>
              </View>
            </View>
          </Card>
          <Row>
            <StatusPill status={p.status} />
            <Body muted>
              {tzs(p.fee_tzs)} · {p.payer === 'shop' ? 'shop pays' : 'customer pays'} · {p.fee_paid ? 'paid' : 'not paid yet'}
            </Body>
          </Row>
          <H2>Journey</H2>
          <Card>
            <Timeline events={data.events} current={p.status} agentPlace={agent.place} agentHost={agent.host} />
          </Card>
        </>
      ) : null}
      <Button label="Back to my parcels" variant="ghost" onPress={() => router.replace('/shop')} />
    </Screen>
  );
}
