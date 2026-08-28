import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';

import { formatRankingsAsOf, useEngineState } from '@/components/useEngineState';
import { DEFAULT_CONFIG } from '@/constants/league';
import { formatPickClock } from '@/lib/engine/snakeMath';
import { nextOverall } from '@/lib/state/draftTypes';
import { useDraftStore } from '@/lib/state/draftStore';
import { useSnapshotStore } from '@/lib/state/snapshotStore';

const Setup = () => {
  const router = useRouter();
  const picks = useDraftStore((s) => s.picks);
  const draftStartedAt = useDraftStore((s) => s.draftStartedAt);
  const config = useDraftStore((s) => s.config);
  const teamNames = useDraftStore((s) => s.teamNames);
  const setTeamNames = useDraftStore((s) => s.setTeamNames);
  const setConfig = useDraftStore((s) => s.setConfig);
  const startDraft = useDraftStore((s) => s.startDraft);
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const engine = useEngineState();
  const [localNames, setLocalNames] = useState(teamNames);

  const rankings = formatRankingsAsOf(snapshot?.fetchedAt);
  const resume = picks.length > 0 || draftStartedAt != null;

  const begin = async (mode: 'real' | 'mock') => {
    const names = [...localNames];
    names[11] = 'You';
    await setTeamNames(names);
    await startDraft(mode);
    router.push('/draft');
  };

  if (resume) {
    const overall = engine?.onClock.overall ?? nextOverall(picks);
    const slot = engine?.onClock.teamSlot ?? 1;
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text variant="bodyMedium">{rankings}</Text>
        <Card style={styles.card}>
          <Card.Title title="Resume draft" />
          <Card.Content>
            <Text>
              Next {formatPickClock(overall, config.teams)} · {teamNames[slot - 1] ?? `Team ${slot}`} on
              the clock
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={() => router.push('/draft')}>
              Resume draft
            </Button>
          </Card.Actions>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text variant="bodyMedium">{rankings}</Text>
      <TextInput
        label="Teams"
        value={String(config.teams)}
        keyboardType="number-pad"
        style={styles.field}
        onChangeText={(t) => {
          const n = Number(t);
          if (n > 0) void setConfig({ ...config, teams: n });
        }}
      />
      <TextInput
        label="Your slot"
        value={String(config.userSlot)}
        keyboardType="number-pad"
        style={styles.field}
        onChangeText={(t) => {
          const n = Number(t);
          if (n > 0) void setConfig({ ...config, userSlot: n });
        }}
      />
      <TextInput
        label="Rounds"
        value={String(config.rounds)}
        keyboardType="number-pad"
        style={styles.field}
        onChangeText={(t) => {
          const n = Number(t);
          if (n > 0) void setConfig({ ...config, rounds: n });
        }}
      />
      <Text variant="labelLarge">Opponents</Text>
      {localNames.slice(0, 11).map((name, i) => (
        <TextInput
          key={i}
          label={`Team ${i + 1}`}
          value={name}
          style={styles.field}
          onChangeText={(t) => {
            const next = localNames.slice();
            next[i] = t;
            setLocalNames(next);
          }}
        />
      ))}
      <Text variant="bodySmall">You are slot {config.userSlot || DEFAULT_CONFIG.userSlot}</Text>
      <View style={styles.row}>
        <Button mode="contained" onPress={() => void begin('real')}>
          Start Draft
        </Button>
        <Button mode="outlined" onPress={() => void begin('mock')}>
          Start Mock Draft
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 8 },
  card: { marginTop: 12 },
  field: { marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
});

export default Setup;
