import { useState } from 'react';
import { Switch } from 'react-native';

import { ParcelRow } from '@/components/parcel-row';
import { SignOutButton } from '@/components/sign-out';
import { Body, Button, Card, Empty, ErrorText, Field, H2, Notice, Row, Screen, Stats } from '@/components/ui';
import { loadDirectory } from '@/lib/agents';
import { displayPhone, tzs } from '@/lib/format';
import { useSession } from '@/lib/session';
import { errorText, supabase } from '@/lib/supabase';
import type { Parcel } from '@/lib/types';
import { must, useLoad } from '@/lib/use-async';

const AGENT_FEE_TZS = 500;

export default function AgentShelf() {
  const { profile } = useSession();
  const [code, setCode] = useState('');
  const [feeCollected, setFeeCollected] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload } = useLoad(async () => {
    const [dir, parcels] = await Promise.all([
      loadDirectory(),
      supabase.from('parcels').select('*').order('updated_at', { ascending: false }).limit(200),
    ]);
    return { dir, parcels: must(parcels) as Parcel[] };
  });

  async function handOver() {
    if (!/^\d{4}$/.test(code.trim())) return setActionError("Enter the 4-digit code from the customer's SMS.");
    setBusy(true);
    setActionError(null);
    const { data: p, error: e } = await supabase.rpc('hand_over', { p_collection_code: code, p_fee_collected: feeCollected });
    setBusy(false);
    if (e) return setActionError(errorText(e));
    const parcel = p as Parcel;
    setNotice(`Handed ${parcel.code} to ${parcel.customer_name}.`);
    setCode('');
    setFeeCollected(false);
    reload();
  }

  const me = profile?.agent_id ? data?.dir.byId[profile.agent_id] : undefined;
  const parcels = data?.parcels ?? [];
  const shelf = parcels.filter((p) => p.status === 'at_agent');
  const collected = parcels.filter((p) => p.status === 'collected');
  const today = new Date().toDateString();

  return (
    <Screen title={me?.host ?? 'Agent'} subtitle={me ? `Pikii agent · ${me.place}` : undefined} right={<SignOutButton />} refreshing={loading} onRefresh={reload}>
      <Notice>{notice}</Notice>
      <ErrorText>{error}</ErrorText>
      <Stats
        items={[
          { value: shelf.length, label: 'on your shelf' },
          { value: parcels.filter((p) => p.status === 'on_route').length, label: 'coming today' },
          { value: collected.length * AGENT_FEE_TZS, label: 'TZS earned' },
        ]}
      />
      <H2>Hand over a parcel</H2>
      <Card>
        <Field label="Customer's code from their SMS" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={4} placeholder="4 digits" />
        <Row>
          <Body>I collected the delivery fee from the customer</Body>
          <Switch value={feeCollected} onValueChange={setFeeCollected} />
        </Row>
        <ErrorText>{actionError}</ErrorText>
        <Button label="Check code and hand over" onPress={handOver} busy={busy} />
      </Card>
      <H2>On your shelf</H2>
      {shelf.length === 0 && !loading ? <Empty>Nothing on the shelf. Parcels show here when the rider drops them.</Empty> : null}
      {shelf.map((p) => (
        <ParcelRow
          key={p.id}
          parcel={p}
          extra={
            <Body muted>
              {displayPhone(p.customer_phone)}
              {p.payer === 'customer' && !p.fee_paid ? ` · collect ${tzs(p.fee_tzs)}` : ' · fee paid'}
            </Body>
          }
        />
      ))}
      <Body muted>{collected.filter((p) => new Date(p.created_at).toDateString() === today).length} handed over today.</Body>
    </Screen>
  );
}
