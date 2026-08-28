import { ScrollView, StyleSheet } from 'react-native';

import type { DraftConfig } from '@/constants/league';
import type { Player } from '@/lib/data/types';
import type { EngineState } from '@/lib/state/engineSelectors';
import { MyRoster } from './MyRoster';
import { OnClockTeam } from './OnClockTeam';
import { RecommendationCard } from './RecommendationCard';

export const RightPane = ({
  engine,
  cfg,
  userSlot,
  onClockName,
  byId,
}: {
  engine: EngineState;
  cfg: DraftConfig;
  userSlot: number;
  onClockName: string;
  byId: Map<string, Player>;
}) => (
  <ScrollView style={styles.pane}>
    <RecommendationCard engine={engine} />
    <MyRoster ids={engine.rosters.get(userSlot) ?? []} byId={byId} cfg={cfg} />
    <OnClockTeam
      name={onClockName}
      ids={engine.rosters.get(engine.onClock.teamSlot) ?? []}
      byId={byId}
      cfg={cfg}
    />
  </ScrollView>
);

const styles = StyleSheet.create({
  pane: { flex: 1 },
});
