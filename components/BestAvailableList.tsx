import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import type { Position } from '@/constants/league';
import { POSITION_COLORS, survivalColor } from '@/constants/positionColors';
import type { Player } from '@/lib/data/types';
import { vorp } from '@/lib/engine/vorp';
import type { PlayerTag } from '@/lib/state/draftTypes';
import type { EngineState } from '@/lib/state/engineSelectors';
import type { PositionFilter } from './PositionFilterChips';

type Row =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'player'; key: string; player: Player };

export const BestAvailableList = ({
  engine,
  filter,
  tags,
  onPick,
  onOpenPlayer,
}: {
  engine: EngineState;
  filter: PositionFilter;
  tags: Record<string, PlayerTag | undefined>;
  onPick: (player: Player) => void;
  onOpenPlayer: (id: string) => void;
}) => {
  const data = useMemo(() => buildRows(engine, filter), [engine, filter]);

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.key}
      extraData={tags}
      renderItem={({ item }) => {
        if (item.kind === 'header') {
          return (
            <Text variant="labelLarge" style={styles.header}>
              {item.title}
            </Text>
          );
        }
        return (
          <PlayerRow
            player={item.player}
            engine={engine}
            tag={tags[item.player.id]}
            onPick={() => onPick(item.player)}
            onOpenPlayer={() => onOpenPlayer(item.player.id)}
          />
        );
      }}
    />
  );
};

const PlayerRow = ({
  player,
  engine,
  tag,
  onPick,
  onOpenPlayer,
}: {
  player: Player;
  engine: EngineState;
  tag: PlayerTag | undefined;
  onPick: () => void;
  onOpenPlayer: () => void;
}) => {
  const survival = engine.sim?.survival.get(player.id) ?? 1;
  const v = vorp(player.position, player.posRank, engine.baselines);
  return (
    <Pressable onPress={onPick} onLongPress={onOpenPlayer} style={styles.row}>
      <Text style={styles.rank}>{player.overallRank}</Text>
      <View style={[styles.pill, { backgroundColor: POSITION_COLORS[player.position] }]}>
        <Text style={styles.pillText}>{player.position}</Text>
      </View>
      <View style={styles.mid}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {player.name}
          {player.injuryStatus ? ' ⚑' : ''}
        </Text>
        <Text variant="bodySmall">
          {player.team} · bye {player.bye ?? '—'}
          {player.adp != null ? ` · adp ${player.adp.toFixed(1)}` : ''}
        </Text>
      </View>
      <Text style={styles.vorp}>{Math.round(v)}</Text>
      <Text style={[styles.surv, { color: survivalColor(survival) }]}>
        {Math.round(survival * 100)}%
      </Text>
      {tag === 'target' ? <Text>★</Text> : null}
      {tag === 'avoid' ? <Text>✕</Text> : null}
      <IconButton icon="chevron-right" size={18} onPress={onOpenPlayer} style={styles.chev} />
    </Pressable>
  );
};

const buildRows = (engine: EngineState, filter: PositionFilter): Row[] => {
  if (filter === 'ALL') {
    return [...engine.available]
      .sort((a, b) => a.overallRank - b.overallRank)
      .map((player) => ({ kind: 'player', key: player.id, player }));
  }
  const bands = engine.tiers.get(filter as Position) ?? [];
  const byId = new Map(engine.available.map((p) => [p.id, p]));
  const rows: Row[] = [];
  for (const band of bands) {
    const players = band.playerIds.map((id) => byId.get(id)).filter((p): p is Player => p != null);
    if (players.length === 0) continue;
    rows.push({ kind: 'header', key: `t-${filter}-${band.tier}`, title: `Tier ${band.tier}` });
    for (const player of players) {
      rows.push({ kind: 'player', key: player.id, player });
    }
  }
  return rows;
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    minHeight: 48,
    gap: 6,
  },
  rank: { width: 28, textAlign: 'right' },
  pill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700' },
  mid: { flex: 1 },
  vorp: { width: 36, textAlign: 'right' },
  surv: { width: 40, textAlign: 'right', fontWeight: '700' },
  chev: { margin: 0, width: 32, height: 32 },
});
