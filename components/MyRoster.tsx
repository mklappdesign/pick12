import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import type { DraftConfig, Position } from '@/constants/league';
import { POSITION_COLORS } from '@/constants/positionColors';
import type { Player } from '@/lib/data/types';

const STARTER_ORDER: { key: string; pos: Position | 'FLEX' }[] = [
  { key: 'QB', pos: 'QB' },
  { key: 'RB1', pos: 'RB' },
  { key: 'RB2', pos: 'RB' },
  { key: 'WR1', pos: 'WR' },
  { key: 'WR2', pos: 'WR' },
  { key: 'WR3', pos: 'WR' },
  { key: 'TE', pos: 'TE' },
  { key: 'FLEX', pos: 'FLEX' },
  { key: 'K', pos: 'K' },
  { key: 'DST', pos: 'DST' },
];

export const assignRosterSlots = (
  ids: string[],
  byId: Map<string, Player>,
  cfg: DraftConfig,
): { starters: { key: string; pos: Position | 'FLEX'; player: Player | null }[]; bench: Player[] } => {
  const players = ids.map((id) => byId.get(id)).filter((p): p is Player => p != null);
  const dedicatedLeft: Record<Position, number> = {
    QB: cfg.starters.QB,
    RB: cfg.starters.RB,
    WR: cfg.starters.WR,
    TE: cfg.starters.TE,
    K: cfg.starters.K,
    DST: cfg.starters.DST,
  };
  const filled: Record<string, Player | null> = Object.fromEntries(STARTER_ORDER.map((s) => [s.key, null]));
  const bench: Player[] = [];
  let flexOpen = cfg.starters.FLEX > 0;

  for (const p of players) {
    const want = dedicatedLeft[p.position];
    if (want > 0) {
      const slot = STARTER_ORDER.find((s) => s.pos === p.position && filled[s.key] == null);
      if (slot) {
        filled[slot.key] = p;
        dedicatedLeft[p.position] -= 1;
        continue;
      }
    }
    if (flexOpen && (p.position === 'RB' || p.position === 'WR' || p.position === 'TE')) {
      filled.FLEX = p;
      flexOpen = false;
      continue;
    }
    bench.push(p);
  }

  const starters = STARTER_ORDER.map((s) => ({ ...s, player: filled[s.key] ?? null }));
  return { starters, bench: bench.slice(0, cfg.bench) };
};

const byeClashKeys = (
  starters: { key: string; player: Player | null }[],
): Set<string> => {
  const byBye = new Map<number, string[]>();
  for (const s of starters) {
    const bye = s.player?.bye;
    if (bye == null) continue;
    const list = byBye.get(bye) ?? [];
    list.push(s.key);
    byBye.set(bye, list);
  }
  const clash = new Set<string>();
  for (const keys of byBye.values()) {
    if (keys.length >= 2) for (const k of keys) clash.add(k);
  }
  return clash;
};

export const MyRoster = ({
  ids,
  byId,
  cfg,
}: {
  ids: string[];
  byId: Map<string, Player>;
  cfg: DraftConfig;
}) => {
  const { starters, bench } = assignRosterSlots(ids, byId, cfg);
  const clash = byeClashKeys(starters);
  return (
    <View style={styles.wrap}>
      <Text variant="titleSmall">My roster</Text>
      {starters.map((s) => (
        <SlotRow
          key={s.key}
          label={s.key}
          player={s.player}
          clash={clash.has(s.key)}
          pos={s.player?.position ?? (s.pos === 'FLEX' ? 'RB' : s.pos)}
        />
      ))}
      <Text variant="labelLarge" style={styles.benchLabel}>
        Bench
      </Text>
      {Array.from({ length: cfg.bench }, (_, i) => (
        <SlotRow
          key={`B${i}`}
          label={`BN${i + 1}`}
          player={bench[i] ?? null}
          clash={false}
          pos={bench[i]?.position ?? 'RB'}
        />
      ))}
    </View>
  );
};

const SlotRow = ({
  label,
  player,
  clash,
  pos,
}: {
  label: string;
  player: Player | null;
  clash: boolean;
  pos: Position;
}) => (
  <View style={styles.slot}>
    <View style={[styles.dot, { backgroundColor: POSITION_COLORS[pos] }]} />
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.name} numberOfLines={1}>
      {player ? player.name : '—'}
      {clash ? ' ⚠ bye' : ''}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { padding: 8, gap: 2 },
  benchLabel: { marginTop: 8 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 22 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { width: 40 },
  name: { flex: 1 },
});
