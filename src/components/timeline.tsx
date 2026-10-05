import { Text, View } from 'react-native';

import { STATUS_ORDER, timeOf } from '@/lib/format';
import { useColors } from '@/lib/theme';
import type { ParcelStatus } from '@/lib/types';

export function Timeline({
  events,
  current,
  agentPlace,
  agentHost,
}: {
  events: { status: ParcelStatus; at: string }[];
  current: ParcelStatus;
  agentPlace: string;
  agentHost: string;
}) {
  const c = useColors();
  const reached = STATUS_ORDER.indexOf(current);
  const label: Record<ParcelStatus, string> = {
    booked: 'Booked by the shop',
    at_sort: 'Checked in at the Pikii sorting point',
    on_route: `On the boda to ${agentPlace}`,
    at_agent: `Ready at ${agentHost}`,
    collected: 'Collected',
  };
  return (
    <View>
      {STATUS_ORDER.map((s, i) => {
        const on = i <= reached;
        const at = events.find((e) => e.status === s)?.at;
        const last = i === STATUS_ORDER.length - 1;
        return (
          <View key={s} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ alignItems: 'center', width: 14 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, borderWidth: 2, borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brand : c.surface }} />
              {!last ? <View style={{ width: 2, flex: 1, backgroundColor: i < reached ? c.brand : c.line }} /> : null}
            </View>
            <View style={{ paddingBottom: last ? 0 : 12, flex: 1 }}>
              <Text style={{ color: on ? c.ink : c.muted, fontSize: 14.5 }}>{label[s]}</Text>
              {on && at ? <Text style={{ color: c.muted, fontSize: 12.5 }}>{timeOf(at)}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
