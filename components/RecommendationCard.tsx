import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';

import type { EngineState } from '@/lib/state/engineSelectors';

export const RecommendationCard = ({ engine }: { engine: EngineState }) => {
  const cliffs = engine.cliffs.map(
    (c) => `last ${c.playerIds.length} ${c.pos}s in tier ${c.tier}`,
  );
  return (
    <Card style={styles.card}>
      <Card.Title title={engine.pair ? 'Pair' : 'Recommendations'} />
      <Card.Content>
        {cliffs.map((line) => (
          <Text key={line} variant="labelSmall">
            {line}
          </Text>
        ))}
        {engine.pair ? (
          <View style={styles.gap}>
            <Text variant="titleSmall">
              {engine.pair.pair[0].name} then {engine.pair.pair[1].name}
            </Text>
            {engine.pair.recs.map((r) => (
              <Text key={r.player.id} variant="bodySmall">
                {r.reason}
              </Text>
            ))}
          </View>
        ) : (
          engine.recommendations.slice(0, 5).map((r, i) => (
            <View key={r.player.id} style={styles.gap}>
              <Text variant="bodyMedium">
                {i + 1}. {r.player.name}
              </Text>
              <Text variant="bodySmall">{r.reason}</Text>
            </View>
          ))
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { margin: 8 },
  gap: { marginBottom: 8 },
});
