import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { ParcelRow } from '@/components/parcel-row';
import { SignOutButton } from '@/components/sign-out';
import { Body, Button, Empty, ErrorText, H2, Screen, Stats } from '@/components/ui';
import { loadDirectory } from '@/lib/agents';
import { supabase } from '@/lib/supabase';
import type { Parcel } from '@/lib/types';
import { must, useLoad } from '@/lib/use-async';

export default function ShopHome() {
  const { data, error, loading, reload } = useLoad(async () => {
    const [dir, parcels] = await Promise.all([
      loadDirectory(),
      supabase.from('parcels').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    const shop = must(await supabase.from('shops').select('name, location').single()) as { name: string; location: string };
    return { dir, shop, parcels: must(parcels) as Parcel[] };
  });

  // Refresh when coming back from booking a parcel.
  useFocusEffect(useCallback(() => void reload(), [reload]));

  const parcels = data?.parcels ?? [];
  const today = new Date().toDateString();
  return (
    <Screen
      title={data?.shop.name ?? 'Your shop'}
      subtitle={data?.shop.location}
      right={<SignOutButton />}
      refreshing={loading}
      onRefresh={reload}>
      <Button label="+ Book a parcel" variant="sun" onPress={() => router.push('/shop/book')} />
      <Stats
        items={[
          { value: parcels.filter((p) => new Date(p.created_at).toDateString() === today).length, label: 'booked today' },
          { value: parcels.filter((p) => p.status === 'at_agent').length, label: 'waiting at agents' },
          { value: parcels.filter((p) => p.status === 'collected').length, label: 'collected' },
        ]}
      />
      <ErrorText>{error}</ErrorText>
      <H2>Your parcels</H2>
      {parcels.length === 0 && !loading ? <Empty>No parcels yet. Book one when a customer buys from you.</Empty> : null}
      {parcels.map((p) => (
        <ParcelRow key={p.id} parcel={p} agent={data?.dir.byId[p.agent_id]} onPress={() => router.push(`/shop/parcel/${p.id}`)} />
      ))}
      <Body muted>Book before the 10:00 cutoff and the Pikii runner collects from your shop for same-day delivery.</Body>
    </Screen>
  );
}
