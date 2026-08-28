import { StyleSheet, View } from 'react-native';
import { Button, Chip, IconButton, Text } from 'react-native-paper';

export type DraftHeaderProps = {
  clock: string;
  rankingsAsOf: string;
  onUndo: () => void;
  showSkip?: boolean;
  onSkip?: () => void;
};

export const DraftHeader = ({
  clock,
  rankingsAsOf,
  onUndo,
  showSkip,
  onSkip,
}: DraftHeaderProps) => (
  <View style={styles.row}>
    <View style={styles.clock}>
      <Text variant="titleSmall">{clock}</Text>
      <Chip compact style={styles.chip}>
        {rankingsAsOf}
      </Chip>
    </View>
    {showSkip ? (
      <Button compact onPress={onSkip} accessibilityLabel="Skip to my turn">
        Skip to my turn
      </Button>
    ) : null}
    <IconButton
      icon="undo"
      accessibilityLabel="Undo"
      onPress={onUndo}
      style={styles.undo}
      size={24}
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 8,
  },
  clock: { flex: 1, gap: 4 },
  chip: { alignSelf: 'flex-start' },
  undo: { width: 44, height: 44, margin: 0 },
});
