import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Scanner } from '@/components/scanner';
import { SignOutButton } from '@/components/sign-out';
import { Body, Button, Card, ErrorText, H2, Notice, Pill, Row, Screen } from '@/components/ui';
import { errorText, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Parcel, Profile, RouteBoardRow } from '@/lib/types';
import { must, useLoad } from '@/lib/use-async';

export default function StaffBoard() {
  const c = useColors();
  const [scanning, setScanning] = useState(false);
  const [feeCollected, setFeeCollected] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyRoute, setBusyRoute] = useState<string | null>(null);

  const { data, error, loading, reload } = useLoad(async () => {
    const [board, arriving, riders] = await Promise.all([
      supabase.rpc('route_board'),
      supabase.from('parcels').select('id', { count: 'exact', head: true }).eq('status', 'booked'),
      supabase.from('profiles').select('*').eq('role', 'rider').order('full_name'),
    ]);
    if (arriving.error) throw arriving.error;
    return { board: must(board) as RouteBoardRow[], arriving: arriving.count ?? 0, riders: must(riders) as Profile[] };
  });

  async function checkIn(code: string) {
    setActionError(null);
    const { data: p, error: e } = await supabase.rpc('check_in_parcel', { p_code: code, p_fee_collected: feeCollected });
    if (e) return setActionError(`${code}: ${errorText(e)}`);
    const parcel = p as Parcel;
    setNotice(`${parcel.code} checked in${parcel.payer === 'shop' && !parcel.fee_paid ? ' (fee not paid yet)' : ''}.`);
    reload();
  }

  async function send(row: RouteBoardRow, force: boolean) {
    const rider = data?.riders.find((r) => r.route_id === row.route_id) ?? data?.riders[0];
    if (!rider) return setActionError('Add a rider account before sending a run.');
    setBusyRoute(row.route_id);
    setActionError(null);
    const { error: e } = await supabase.rpc('send_run', { p_route_id: row.route_id, p_rider_id: rider.id, p_force: force });
    setBusyRoute(null);
    if (e) return setActionError(errorText(e));
    setNotice(`${rider.full_name} left with ${row.ready} parcels for ${row.route_name}. Customers are getting an SMS.`);
    reload();
  }

  return (
    <Screen title="Sorting point" subtitle="Kariakoo" right={<SignOutButton />} refreshing={loading} onRefresh={reload}>
      <Notice>{notice}</Notice>
      <ErrorText>{error ?? actionError}</ErrorText>
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.ink, fontWeight: '700' }}>Arriving from shops</Text>
            <Body muted>Scan each parcel as the runner drops it.</Body>
          </View>
          <Pill text={String(data?.arriving ?? 0)} />
        </Row>
        <Row>
          <Body>Runner collected the shop&apos;s fee</Body>
          <Switch value={feeCollected} onValueChange={setFeeCollected} />
        </Row>
        <Button label="Scan parcels in" variant="sun" onPress={() => setScanning(true)} />
      </Card>

      <H2>Routes</H2>
      {data?.board.map((row) => {
        const full = row.ready >= row.min_run;
        const rider = data.riders.find((r) => r.route_id === row.route_id) ?? data.riders[0];
        return (
          <Card key={row.route_id}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink, fontWeight: '700' }}>{row.route_name}</Text>
                <Body muted>
                  {rider ? `Rider ${rider.full_name}` : 'No rider yet'}
                  {row.out_now ? ` · ${row.out_now} out now` : ''}
                </Body>
              </View>
              <Pill text={`${row.ready} / ${row.min_run}`} bg={full ? c.goodSoft : c.sunSoft} fg={full ? c.good : c.warn} />
            </Row>
            <View style={{ height: 10, borderRadius: 99, backgroundColor: c.chip, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.min(100, (row.ready / row.min_run) * 100)}%`, backgroundColor: full ? c.good : c.sun }} />
            </View>
            {full ? (
              <Button label={`Send ${row.ready} parcels with ${rider?.full_name ?? 'rider'}`} busy={busyRoute === row.route_id} onPress={() => send(row, false)} />
            ) : row.ready > 0 ? (
              <Button label={`Send anyway with ${row.ready} parcels`} variant="ghost" busy={busyRoute === row.route_id} onPress={() => send(row, true)} />
            ) : null}
          </Card>
        );
      })}
      <Body muted>A run normally leaves only when it has enough parcels to cover the boda&apos;s cost.</Body>
      <Scanner visible={scanning} title="Scan parcels in" onCode={checkIn} onClose={() => setScanning(false)} />
    </Screen>
  );
}
