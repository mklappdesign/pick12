import { useKeepAwake } from 'expo-keep-awake';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { BestAvailableList } from '@/components/BestAvailableList';
import { DraftHeader } from '@/components/DraftHeader';
import { PickConfirmSheet } from '@/components/PickConfirmSheet';
import { PositionFilterChips, type PositionFilter } from '@/components/PositionFilterChips';
import { RightPane } from '@/components/RightPane';
import { formatRankingsAsOf, useEngineState } from '@/components/useEngineState';
import type { Player } from '@/lib/data/types';
import { mockSeed } from '@/lib/engine/runMockToUser';
import { mulberry32 } from '@/lib/engine/rng';
import { sampleOpponentPick } from '@/lib/engine/sampleOpponentPick';
import { formatPickClock, picksUntilUser, slotOnClock } from '@/lib/engine/snakeMath';
import { nextOverall } from '@/lib/state/draftTypes';
import { useDraftStore } from '@/lib/state/draftStore';
import { useSnapshotStore } from '@/lib/state/snapshotStore';

const Draft = () => {
  useKeepAwake();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const split = width >= 900;
  const engine = useEngineState();
  const config = useDraftStore((s) => s.config);
  const teamNames = useDraftStore((s) => s.teamNames);
  const tags = useDraftStore((s) => s.tags);
  const makePick = useDraftStore((s) => s.makePick);
  const undo = useDraftStore((s) => s.undo);
  const skipToMyTurn = useDraftStore((s) => s.skipToMyTurn);
  const mode = useDraftStore((s) => s.mode);
  const picks = useDraftStore((s) => s.picks);
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const [filter, setFilter] = useState<PositionFilter>('ALL');
  const [confirmPlayer, setConfirmPlayer] = useState<Player | null>(null);
  const [confirmSlot, setConfirmSlot] = useState(1);

  const onClockOverall = engine?.onClock.overall ?? nextOverall(picks, config.teams * config.rounds);
  const userSlot = config.userSlot;
  const picksLength = picks.length;

  useEffect(() => {
    if (mode !== 'mock') return;
    if (!snapshot) return;
    const total = config.teams * config.rounds;
    if (onClockOverall > total) return;
    if (slotOnClock(onClockOverall, config.teams) === userSlot) return;
    const t = setTimeout(() => {
      const cur = useDraftStore.getState();
      const overall = nextOverall(cur.picks, total);
      if (overall > total) return;
      if (slotOnClock(overall, cur.config.teams) === cur.config.userSlot) return;
      const taken = new Set(cur.picks.map((p) => p.playerId));
      const available = snapshot.players.filter((p) => !taken.has(p.id));
      if (available.length === 0) return;
      const slot = slotOnClock(overall, cur.config.teams);
      const rosterIds = cur.picks.filter((p) => p.teamSlot === slot).map((p) => p.playerId);
      const playersById = new Map(snapshot.players.map((p) => [p.id, p]));
      const id = sampleOpponentPick({
        available,
        rosterIds,
        playersById,
        overall,
        cfg: cur.config,
        rng: mulberry32(mockSeed(cur.draftStartedAt ?? '', overall)),
      });
      void cur.makePick(id);
    }, 150);
    return () => clearTimeout(t);
  }, [mode, onClockOverall, userSlot, picksLength, snapshot, config.teams, config.rounds]);

  if (!engine || !snapshot) {
    return (
      <View style={styles.center}>
        <Text>Loading rankings…</Text>
      </View>
    );
  }

  const { overall, teamSlot } = engine.onClock;
  const untilYou = picksUntilUser(overall, config);
  const clock = `${formatPickClock(overall, config.teams)} · ${teamNames[teamSlot - 1] ?? `Team ${teamSlot}`} on the clock · ${untilYou} until you`;
  const byId = new Map(snapshot.players.map((p) => [p.id, p]));

  const openConfirm = (player: Player, slot = teamSlot) => {
    setConfirmSlot(slot);
    setConfirmPlayer(player);
  };

  const list = (
    <View style={styles.list}>
      <PositionFilterChips value={filter} onChange={setFilter} />
      <BestAvailableList
        engine={engine}
        filter={filter}
        tags={tags}
        onPick={(p) => openConfirm(p)}
        onOpenPlayer={(id) => router.push(`/player/${encodeURIComponent(id)}`)}
      />
    </View>
  );

  const pane = (
    <View style={[styles.pane, split ? undefined : styles.paneStacked]}>
      <RightPane
        engine={engine}
        cfg={config}
        userSlot={config.userSlot}
        onClockName={teamNames[teamSlot - 1] ?? `Team ${teamSlot}`}
        byId={byId}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerRight: () => (
            <View style={styles.headerBtns}>
              <Button compact onPress={() => router.push('/board')}>
                Board
              </Button>
              <Button compact onPress={() => router.push('/settings')}>
                Settings
              </Button>
            </View>
          ),
        }}
      />
      <DraftHeader
        clock={clock}
        rankingsAsOf={formatRankingsAsOf(snapshot.fetchedAt)}
        onUndo={() => void undo()}
        showSkip={mode === 'mock' && teamSlot !== config.userSlot}
        onSkip={() => void skipToMyTurn(snapshot)}
      />
      <View style={split ? styles.split : styles.stack}>
        {list}
        {pane}
      </View>
      <PickConfirmSheet
        visible={confirmPlayer != null}
        player={confirmPlayer}
        teamSlot={confirmSlot}
        teamNames={teamNames}
        isUserTurn={confirmSlot === config.userSlot}
        onChangeSlot={setConfirmSlot}
        onConfirm={() => {
          const p = confirmPlayer;
          const slot = confirmSlot;
          setConfirmPlayer(null);
          if (p) void makePick(p.id, slot);
        }}
        onDismiss={() => setConfirmPlayer(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBtns: { flexDirection: 'row' },
  split: { flex: 1, flexDirection: 'row' },
  stack: { flex: 1, flexDirection: 'column' },
  list: { flex: 6 },
  pane: { flex: 4 },
  paneStacked: { minHeight: 280, flexGrow: 0, flexShrink: 0, flexBasis: 280 },
});

export default Draft;
