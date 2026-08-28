import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';

import type { Position } from '@/constants/league';

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];

export type PositionFilter = 'ALL' | Position;

export const PositionFilterChips = ({
  value,
  onChange,
}: {
  value: PositionFilter;
  onChange: (v: PositionFilter) => void;
}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    <Chip selected={value === 'ALL'} onPress={() => onChange('ALL')} compact>
      ALL
    </Chip>
    {POSITIONS.map((pos) => (
      <Chip key={pos} selected={value === pos} onPress={() => onChange(pos)} compact>
        {pos}
      </Chip>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
});
