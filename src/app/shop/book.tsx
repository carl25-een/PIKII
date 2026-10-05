import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Row, Screen, Segmented } from '@/components/ui';
import { loadDirectory } from '@/lib/agents';
import { normalizePhone, tzs } from '@/lib/format';
import { errorText, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Parcel } from '@/lib/types';
import { useLoad } from '@/lib/use-async';

const ZONE_LABEL = { near: 'Near', middle: 'Middle', far: 'Far' } as const;

export default function BookParcel() {
  const c = useColors();
  const { data: dir, error: loadError } = useLoad(loadDirectory);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [routeId, setRouteId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [size, setSize] = useState<'small' | 'medium'>('small');
  const [payer, setPayer] = useState<'shop' | 'customer'>('shop');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const route = routeId ?? dir?.routes[0]?.id ?? null;
  const agent = agentId ? dir?.byId[agentId] : undefined;
  const fee = agent && dir ? dir.fees[agent.zone] : undefined;

  async function book() {
    if (!name.trim()) return setError("Add the customer's name so the agent can check it.");
    if (!normalizePhone(phone)) return setError("Enter the customer's mobile number like 0712 345 678. Their pickup code goes to this number.");
    if (!agentId) return setError('Pick the agent point nearest the customer.');
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc('book_parcel', {
      p_customer_name: name,
      p_customer_phone: phone,
      p_agent_id: agentId,
      p_size: size,
      p_payer: payer,
    });
    setBusy(false);
    if (e) return setError(errorText(e));
    router.replace(`/shop/parcel/${(data as Parcel).id}`);
  }

  return (
    <Screen title="Book a parcel" subtitle="The customer bought from you. Pikii delivers it.">
      <ErrorText>{loadError}</ErrorText>
      <Field label="Customer name" value={name} onChangeText={setName} placeholder="e.g. Asha Mohamed" autoCapitalize="words" />
      <Field label="Customer mobile number" value={phone} onChangeText={setPhone} placeholder="0712 345 678" keyboardType="phone-pad" />

      <Text style={{ color: c.muted, fontSize: 12.5, fontWeight: '700' }}>Pickup agent near the customer</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {dir?.routes.map((r) => {
          const on = r.id === route;
          return (
            <Pressable
              key={r.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setRouteId(r.id)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: on ? c.brand : c.chip }}>
              <Text style={{ color: on ? c.brandInk : c.ink, fontWeight: '700', fontSize: 13 }}>{r.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {dir?.agents
        .filter((a) => a.route_id === route)
        .map((a) => {
          const on = a.id === agentId;
          return (
            <Pressable key={a.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setAgentId(a.id)}>
              <Card style={on ? { borderColor: c.brand, backgroundColor: c.goodSoft } : undefined}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.ink, fontWeight: '700' }}>{a.place}</Text>
                    <Body muted>{a.host}</Body>
                  </View>
                  <Text style={{ color: c.ink, fontVariant: ['tabular-nums'] }}>{tzs(dir.fees[a.zone])}</Text>
                </Row>
              </Card>
            </Pressable>
          );
        })}

      <Segmented
        label="Parcel size"
        value={size}
        onChange={setSize}
        options={[
          { value: 'small', label: 'Small · fits in a bag' },
          { value: 'medium', label: 'Medium · carton up to 20 kg' },
        ]}
      />
      <Segmented
        label="Who pays delivery"
        value={payer}
        onChange={setPayer}
        options={[
          { value: 'shop', label: 'My shop pays' },
          { value: 'customer', label: 'Customer pays at agent' },
        ]}
      />
      {agent && fee !== undefined ? (
        <Card>
          <Row>
            <Body muted>
              {ZONE_LABEL[agent.zone]} zone · {payer === 'shop' ? 'pay the runner at pickup' : 'customer pays when collecting'}
            </Body>
          </Row>
          <Row>
            <Text style={{ color: c.ink, fontWeight: '700', fontSize: 16 }}>Delivery fee</Text>
            <Text style={{ color: c.ink, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] }}>{tzs(fee)}</Text>
          </Row>
        </Card>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <Button label="Book parcel" onPress={book} busy={busy} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
