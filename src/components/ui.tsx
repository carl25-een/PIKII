import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { STATUS_LABEL } from '@/lib/format';
import { useColors } from '@/lib/theme';
import type { ParcelStatus } from '@/lib/types';

export function Screen({
  title,
  subtitle,
  right,
  children,
  refreshing,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.brand }} edges={['top']}>
      <View style={[styles.bar, { backgroundColor: c.brand }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.barTitle, { color: c.brandInk }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={[styles.barSub, { color: c.brandInk }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

export function H2({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.h2, { color: c.ink }]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  const c = useColors();
  return <Text style={[{ color: muted ? c.muted : c.ink, fontSize: muted ? 13 : 15, lineHeight: muted ? 18 : 21 }, style]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'sun' | 'ghost';
  disabled?: boolean;
  busy?: boolean;
}) {
  const c = useColors();
  const bg = variant === 'primary' ? c.brand : variant === 'sun' ? c.sun : 'transparent';
  const fg = variant === 'primary' ? c.brandInk : variant === 'sun' ? c.sunInk : c.brand;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'ghost' ? c.brand : bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}>
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        {...input}
        style={[styles.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink }]}
      />
    </View>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[styles.seg, { borderColor: on ? c.brand : c.line, backgroundColor: on ? c.goodSoft : c.surface }]}>
              <Text style={{ color: c.ink, fontWeight: on ? '700' : '500', textAlign: 'center', fontSize: 13.5 }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function StatusPill({ status }: { status: ParcelStatus }) {
  const c = useColors();
  const tone = {
    booked: [c.sunSoft, c.warn],
    at_sort: [c.chip, c.ink],
    on_route: [c.warnSoft, c.warn],
    at_agent: [c.goodSoft, c.good],
    collected: [c.brand, c.brandInk],
  }[status];
  return <Pill text={STATUS_LABEL[status]} bg={tone[0]} fg={tone[1]} />;
}

export function Pill({ text, bg, fg }: { text: string; bg?: string; fg?: string }) {
  const c = useColors();
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? c.chip }]}>
      <Text style={{ color: fg ?? c.ink, fontSize: 11.5, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Stats({ items }: { items: { value: string | number; label: string }[] }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((s) => (
        <View key={s.label} style={[styles.stat, { backgroundColor: c.chip }]}>
          <Text style={{ color: c.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{s.value}</Text>
          <Text style={{ color: c.muted, fontSize: 11.5, textAlign: 'center' }}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.muted, textAlign: 'center', paddingVertical: 24, fontSize: 14 }}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  const c = useColors();
  if (!children) return null;
  return <Text style={{ color: c.danger, fontWeight: '700', fontSize: 13.5 }}>{children}</Text>;
}

export function Notice({ children }: { children: ReactNode }) {
  const c = useColors();
  if (!children) return null;
  return (
    <View style={{ backgroundColor: c.goodSoft, borderRadius: 12, padding: 12 }}>
      <Text style={{ color: c.ink, fontSize: 14 }}>{children}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, style]}>{children}</View>;
}

export function Loading() {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator color={c.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  barTitle: { fontSize: 20, fontWeight: '700' },
  barSub: { fontSize: 12.5, opacity: 0.85, marginTop: 2 },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  h2: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  button: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center', borderWidth: 1.5, minHeight: 48, justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  label: { fontSize: 12.5, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  seg: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 6 },
  pill: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  stat: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
});
