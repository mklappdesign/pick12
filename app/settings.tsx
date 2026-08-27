import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Banner, Button, Dialog, Portal, Snackbar, Text, TextInput } from 'react-native-paper';

import { formatRankingsAsOf } from '@/components/useEngineState';
import { formatRosters } from '@/lib/state/exportRosters';
import { useDraftStore } from '@/lib/state/draftStore';
import { useSnapshotStore } from '@/lib/state/snapshotStore';

const Settings = () => {
  const router = useRouter();
  const config = useDraftStore((s) => s.config);
  const picks = useDraftStore((s) => s.picks);
  const draftStartedAt = useDraftStore((s) => s.draftStartedAt);
  const setConfig = useDraftStore((s) => s.setConfig);
  const resetDraft = useDraftStore((s) => s.resetDraft);
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const error = useSnapshotStore((s) => s.error);
  const refreshing = useSnapshotStore((s) => s.refreshing);
  const refresh = useSnapshotStore((s) => s.refresh);
  const locked = draftStartedAt != null || picks.length > 0;
  const unmatched = (snapshot?.players ?? []).filter((p) => p.sleeperMatched === false);
  const [snack, setSnack] = useState(false);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);

  const exportRostersToClipboard = async () => {
    const byId = new Map((snapshot?.players ?? []).map((p) => [p.id, p]));
    const draft = useDraftStore.getState();
    await Clipboard.setStringAsync(formatRosters(draft, byId));
    setSnack(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text variant="bodyMedium">{formatRankingsAsOf(snapshot?.fetchedAt)}</Text>
      {error ? <Banner visible>{error}</Banner> : null}
      <Button mode="contained" loading={refreshing} onPress={() => void refresh()}>
        Refresh Rankings
      </Button>
      {unmatched.length > 0 ? (
        <>
          <Text variant="titleSmall">Unmatched Sleeper names</Text>
          {unmatched.map((p) => (
            <Text key={p.id}>{p.name}</Text>
          ))}
        </>
      ) : null}
      <TextInput
        label="Teams"
        value={String(config.teams)}
        disabled={locked}
        keyboardType="number-pad"
        onChangeText={(t) => {
          const n = Number(t);
          if (n > 0) void setConfig({ ...config, teams: n });
        }}
      />
      <TextInput
        label="Your slot"
        value={String(config.userSlot)}
        disabled={locked}
        keyboardType="number-pad"
        onChangeText={(t) => {
          const n = Number(t);
          if (n > 0) void setConfig({ ...config, userSlot: n });
        }}
      />
      <TextInput
        label="Rounds"
        value={String(config.rounds)}
        disabled={locked}
        keyboardType="number-pad"
        onChangeText={(t) => {
          const n = Number(t);
          if (n > 0) void setConfig({ ...config, rounds: n });
        }}
      />
      <Button mode="outlined" onPress={() => void exportRostersToClipboard()}>
        Export rosters
      </Button>
      <Button mode="contained" onPress={() => setResetStep(1)}>
        Reset draft
      </Button>
      <Portal>
        <Dialog visible={resetStep === 1} onDismiss={() => setResetStep(0)}>
          <Dialog.Title>Reset draft?</Dialog.Title>
          <Dialog.Content>
            <Text>This clears picks. Tags and notes are kept.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetStep(0)}>Cancel</Button>
            <Button onPress={() => setResetStep(2)}>Continue</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={resetStep === 2} onDismiss={() => setResetStep(0)}>
          <Dialog.Title>Confirm reset</Dialog.Title>
          <Dialog.Content>
            <Text>This cannot be undone from the board.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetStep(0)}>Cancel</Button>
            <Button
              onPress={() => {
                setResetStep(0);
                void resetDraft().then(() => router.replace('/'));
              }}
            >
              Reset
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={snack} onDismiss={() => setSnack(false)} duration={2000}>
        Copied rosters
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
});

export default Settings;
