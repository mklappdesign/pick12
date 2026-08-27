import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Banner, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { useEngineState } from '@/components/useEngineState';
import { survivalColor } from '@/constants/positionColors';
import type { PlayerTag } from '@/lib/state/draftTypes';
import { useDraftStore } from '@/lib/state/draftStore';
import { useSnapshotStore } from '@/lib/state/snapshotStore';

const Player = () => {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = decodeURIComponent(Array.isArray(raw) ? raw[0] : (raw ?? ''));
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const tags = useDraftStore((s) => s.tags);
  const notes = useDraftStore((s) => s.notes);
  const setTag = useDraftStore((s) => s.setTag);
  const setNote = useDraftStore((s) => s.setNote);
  const engine = useEngineState();
  const player = snapshot?.players.find((p) => p.id === id);
  const [note, setNoteLocal] = useState(notes[id] ?? '');

  useEffect(() => {
    setNoteLocal(notes[id] ?? '');
  }, [id, notes]);

  if (!player) {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text>Unknown player</Text>
      </ScrollView>
    );
  }

  const tag = tags[id];
  const survival = engine?.sim?.survival.get(id) ?? 1;
  let tier: number | undefined;
  if (engine) {
    const bands = engine.tiers.get(player.position) ?? [];
    tier = bands.find((b) => b.playerIds.includes(id))?.tier;
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      {player.sleeperMatched === false ? (
        <Banner visible icon="alert">
          Unmatched Sleeper id — ADP only
        </Banner>
      ) : null}
      <Text variant="headlineSmall">{player.name}</Text>
      <Text>
        {player.position} · {player.team} · bye {player.bye ?? '—'}
      </Text>
      <Text>ADP {player.adp ?? '—'}</Text>
      {player.injuryStatus ? <Text>Injury: {player.injuryStatus}</Text> : null}
      <Text>Tier {tier ?? '—'}</Text>
      <Text style={{ color: survivalColor(survival) }}>
        Survival {Math.round(survival * 100)}%
      </Text>
      <SegmentedButtons
        value={tag ?? 'none'}
        onValueChange={(v) => {
          const next = v as PlayerTag | 'none';
          void setTag(id, next === 'none' ? null : next);
        }}
        buttons={[
          { value: 'none', label: 'None' },
          { value: 'target', label: 'Target' },
          { value: 'avoid', label: 'Avoid' },
        ]}
      />
      <TextInput
        label="Note"
        value={note}
        onChangeText={setNoteLocal}
        onBlur={() => void setNote(id, note)}
        multiline
        style={styles.note}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  note: { marginTop: 8 },
});

export default Player;
