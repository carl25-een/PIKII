import { Pressable, Text } from 'react-native';

import { useSession } from '@/lib/session';
import { useColors } from '@/lib/theme';

export function SignOutButton() {
  const c = useColors();
  const { signOut } = useSession();
  return (
    <Pressable accessibilityRole="button" onPress={signOut} hitSlop={10}>
      <Text style={{ color: c.brandInk, fontSize: 13, fontWeight: '700', opacity: 0.9 }}>Sign out</Text>
    </Pressable>
  );
}
