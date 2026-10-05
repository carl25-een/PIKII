import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/lib/theme';
import type { Agent, Parcel } from '@/lib/types';

import { Card, Row, StatusPill } from './ui';

export function ParcelRow({ parcel, agent, onPress, extra }: { parcel: Parcel; agent?: Agent; onPress?: () => void; extra?: React.ReactNode }) {
  const c = useColors();
  const body = (
    <Card>
      <Row>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.ink, fontFamily: 'monospace', fontSize: 13 }}>{parcel.code}</Text>
          <Text style={{ color: c.ink, fontSize: 15 }} numberOfLines={1}>
            {parcel.customer_name}
            {agent ? ` · ${agent.place}` : ''}
          </Text>
        </View>
        <StatusPill status={parcel.status} />
      </Row>
      {extra}
    </Card>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  );
}
