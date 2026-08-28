import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { CellEditSheet } from '@/components/CellEditSheet';
import { PickConfirmSheet } from '@/components/PickConfirmSheet';
import { lastName, useEngineState } from '@/components/useEngineState';
import type { Player } from '@/lib/data/types';
import type { Position } from '@/constants/league';
import { POSITION_COLORS } from '@/constants/positionColors';
import { overallFor, slotOnClock } from '@/lib/engine/snakeMath';
import { nextOverall } from '@/lib/state/draftTypes';
import { useDraftStore } from '@/lib/state/draftStore';
import { useSnapshotStore } from '@/lib/state/snapshotStore';

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];

const Board = () => {
  const engine = useEngineState();
  const config = useDraftStore((s) => s.config);
  const picks = useDraftStore((s) => s.picks);
  const teamNames = useDraftStore((s) => s.teamNames);
  const makePick = useDraftStore((s) => s.makePick);
  const editPick = useDraftStore((s) => s.editPick);
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const [editOverall, setEditOverall] = useState<number | null>(null);
  const [fillPlayer, setFillPlayer] = useState<Player | null>(null);
  const [fillSlot, setFillSlot] = useState(1);
  const [fillOpen, setFillOpen] = useState(false);

  const byOverall = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of picks) m.set(p.overall, p.playerId);
    return m;
  }, [picks]);
  const byId = useMemo(
    () => new Map((snapshot?.players ?? []).map((p) => [p.id, p])),
    [snapshot],
  );
  const next = nextOverall(picks, config.teams * config.rounds);

  return (
    <ScrollView>
      <ScrollView horizontal>
        <View>
          {Array.from({ length: config.rounds }, (_, ri) => {
            const round = ri + 1;
            const odd = round % 2 === 1;
            return (
              <View key={round} style={styles.row}>
                <Text style={styles.roundNum}>{round}</Text>
                {Array.from({ length: config.teams }, (_, ci) => {
                  const slot = odd ? ci + 1 : config.teams - ci;
                  const overall = overallFor(round, slot, config.teams);
                  const pid = byOverall.get(overall);
                  const player = pid ? byId.get(pid) : undefined;
                  return (
                    <Pressable
                      key={overall}
                      style={[
                        styles.cell,
                        player
                          ? { backgroundColor: POSITION_COLORS[player.position] }
                          : styles.empty,
                      ]}
                      onPress={() => {
                        if (player) {
                          setEditOverall(overall);
                          return;
                        }
                        if (overall === next) {
                          setFillSlot(slotOnClock(overall, config.teams));
                          setFillPlayer(null);
                          setFillOpen(true);
                        }
                      }}
                    >
                      <Text numberOfLines={1} style={styles.cellText}>
                        {player ? lastName(player.name) : ''}
                      </Text>
                      <Text style={styles.cellSub}>{player ? player.position : overall}</Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        {POSITIONS.map((pos) => (
          <View key={pos} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: POSITION_COLORS[pos] }]} />
            <Text>{pos}</Text>
          </View>
        ))}
      </View>
      <CellEditSheet
        visible={editOverall != null}
        overall={editOverall ?? 0}
        available={engine?.available ?? []}
        onEdit={(id) => {
          const o = editOverall;
          setEditOverall(null);
          if (o != null) void editPick(o, id);
        }}
        onDismiss={() => setEditOverall(null)}
      />
      <PickConfirmSheet
        visible={fillOpen}
        player={fillPlayer}
        teamSlot={fillSlot}
        teamNames={teamNames}
        isUserTurn={fillSlot === config.userSlot}
        available={engine?.available ?? []}
        onSelectPlayer={setFillPlayer}
        onChangeSlot={setFillSlot}
        onConfirm={() => {
          const p = fillPlayer;
          const slot = fillSlot;
          setFillOpen(false);
          setFillPlayer(null);
          if (p) void makePick(p.id, slot);
        }}
        onDismiss={() => {
          setFillOpen(false);
          setFillPlayer(null);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  roundNum: { width: 24, textAlign: 'center' },
  cell: { width: 72, height: 48, margin: 1, padding: 2, justifyContent: 'center' },
  empty: { opacity: 0.4 },
  cellText: { fontSize: 12, fontWeight: '700' },
  cellSub: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 2 },
});

export default Board;
