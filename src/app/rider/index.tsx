import { useState } from 'react';
import { Text, View } from 'react-native';

import { SignOutButton } from '@/components/sign-out';
import { Body, Button, Card, Empty, ErrorText, H2, Notice, Pill, Row, Screen, Stats } from '@/components/ui';
import { loadDirectory } from '@/lib/agents';
import { useSession } from '@/lib/session';
import { errorText, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Parcel } from '@/lib/types';
import { must, useLoad } from '@/lib/use-async';

export default function RiderRun() {
  const c = useColors();
  const { profile } = useSession();
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAgent, setBusyAgent] = useState<string | null>(null);

  const { data, error, loading, reload } = useLoad(async () => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const [dir, parcels] = await Promise.all([
      loadDirectory(),
      supabase.from('parcels').select('*').gte('updated_at', since.toISOString()),
    ]);
    return { dir, parcels: must(parcels) as Parcel[] };
  });

  async function drop(agentId: string) {
    setBusyAgent(agentId);
    setActionError(null);
    const { data: n, error: e } = await supabase.rpc('drop_at_agent', { p_agent_id: agentId });
    setBusyAgent(null);
    if (e) return setActionError(errorText(e));
    setNotice(`${n} parcels dropped at ${data?.dir.byId[agentId]?.host}. Each customer gets their pickup code by SMS.`);
    reload();
  }

  const parcels = data?.parcels ?? [];
  const onBike = parcels.filter((p) => p.status === 'on_route');
  const dropped = parcels.filter((p) => p.status === 'at_agent' || p.status === 'collected');
  const stopIds = [...new Set(parcels.map((p) => p.agent_id))];
  const stops = (data?.dir.agents ?? []).filter((a) => stopIds.includes(a.id));

  return (
    <Screen title={profile?.full_name ?? 'Rider'} subtitle="Today's run" right={<SignOutButton />} refreshing={loading} onRefresh={reload}>
      <Notice>{notice}</Notice>
      <ErrorText>{error ?? actionError}</ErrorText>
      <Stats
        items={[
          { value: onBike.length, label: 'on the bike' },
          { value: dropped.length, label: 'dropped today' },
          { value: stops.length, label: 'stops' },
        ]}
      />
      <H2>Stops</H2>
      {stops.length === 0 && !loading ? <Empty>No run yet today. The sorting point sends your bag when your route is full.</Empty> : null}
      {stops.map((a) => {
        const here = onBike.filter((p) => p.agent_id === a.id);
        const done = dropped.filter((p) => p.agent_id === a.id).length;
        return (
          <Card key={a.id}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink, fontWeight: '700' }}>{a.place}</Text>
                <Body muted>{a.host}</Body>
              </View>
              <Pill text={here.length ? `${here.length} to drop` : `${done} dropped`} bg={here.length ? c.warnSoft : c.goodSoft} fg={here.length ? c.warn : c.good} />
            </Row>
            {here.length ? (
              <>
                <Body muted>{here.map((p) => p.code).join(', ')}</Body>
                <Button label={`Hand ${here.length} parcels to ${a.host}`} busy={busyAgent === a.id} onPress={() => drop(a.id)} />
              </>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
