import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/lib/theme';

import { Body, Button, Field } from './ui';

// Full-screen parcel scanner. Reads the QR on a Pikii label (which holds the parcel code), with typing the
// code as a fallback for torn labels or phones without a working camera.
export function Scanner({
  visible,
  title,
  onCode,
  onClose,
}: {
  visible: boolean;
  title: string;
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [typed, setTyped] = useState('');
  const lastScan = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  function handle(code: string) {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    // The camera reports the same QR many times a second; ignore repeats for 3 seconds.
    const now = Date.now();
    if (lastScan.current.code === clean && now - lastScan.current.at < 3000) return;
    lastScan.current = { code: clean, at: now };
    onCode(clean);
  }

  const canUseCamera = Platform.OS !== 'web' && permission?.granted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ padding: 16, gap: 12, flex: 1 }}>
          <Text style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{title}</Text>
          {canUseCamera ? (
            <View style={styles.cameraBox}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={(r) => handle(r.data)}
              />
            </View>
          ) : Platform.OS !== 'web' ? (
            <View style={{ gap: 8 }}>
              <Body muted>Pikii needs the camera to scan parcel labels.</Body>
              <Button label="Allow camera" onPress={requestPermission} />
            </View>
          ) : null}
          <Field
            label="Or type the parcel code"
            placeholder="PK-123456"
            autoCapitalize="characters"
            autoCorrect={false}
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={() => {
              handle(typed);
              setTyped('');
            }}
          />
          <Button
            label="Use this code"
            variant="sun"
            disabled={!typed.trim()}
            onPress={() => {
              handle(typed);
              setTyped('');
            }}
          />
          <Button label="Done scanning" variant="ghost" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cameraBox: { height: 300, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
});
