import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import type { DraftConfig, Position } from '@/constants/league';
import type { Player } from '@/lib/data/types';
import { countByPos } from '@/lib/engine/need';

const DEDICATED: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];

export const OnClockTeam = ({
  name,
  ids,
  byId,
  cfg,
}: {
  name: string;
  ids: string[];
  byId: Map<string, Player>;
  cfg: DraftConfig;
}) => {
  const counts = countByPos(ids, byId);
  const needs = DEDICATED.filter((pos) => (counts[pos] ?? 0) < cfg.starters[pos]);
  return (
    <View style={styles.wrap}>
      <Text variant="titleSmall">{name} on the clock</Text>
      <Text variant="bodySmall">
        Needs: {needs.length ? needs.join(', ') : 'flex / bench'}
      </Text>
      {ids.length === 0 ? (
        <Text variant="bodySmall">Empty roster</Text>
      ) : (
        ids.map((id) => {
          const p = byId.get(id);
          return (
            <Text key={id} variant="bodySmall">
              {p ? `${p.name} ${p.position}` : id}
            </Text>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { padding: 8, gap: 4 },
});
