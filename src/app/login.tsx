import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Screen } from '@/components/ui';
import { normalizePhone } from '@/lib/format';
import { useSession } from '@/lib/session';
import { errorText, loginEmailForPhone, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';

export default function Login() {
  const c = useColors();
  const { session } = useSession();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Redirect href="/" />;

  async function signIn() {
    const normalized = normalizePhone(phone);
    if (!normalized) return setError('Enter your mobile number like 0712 345 678.');
    if (pin.length < 6) return setError('Your PIN has at least 6 digits.');
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithPassword({ email: loginEmailForPhone(normalized), password: pin });
    setBusy(false);
    if (e) return setError(errorText(e));
    router.replace('/');
  }

  return (
    <Screen title="Pikii" subtitle="Parcels from Kariakoo to your area">
      <View style={{ alignItems: 'flex-start', paddingVertical: 8 }}>
        <Text style={{ fontSize: 40, fontWeight: '800', color: c.brand, letterSpacing: -1 }}>
          pikii<Text style={{ color: c.sun }}>.</Text>
        </Text>
      </View>
      <Card>
        <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0712 345 678" autoComplete="tel" />
        <Field label="PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry placeholder="6 digits or more" onSubmitEditing={signIn} />
        <ErrorText>{error}</ErrorText>
        <Button label="Sign in" onPress={signIn} busy={busy} />
      </Card>
      <Body muted>For shops, riders, agents and Pikii staff. Pikii staff create your account and give you your PIN.</Body>
    </Screen>
  );
}
