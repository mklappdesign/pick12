import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, List, Menu, Modal, Portal, Searchbar, Text, useTheme } from 'react-native-paper';

import { nameKey } from '@/lib/data/normalizeName';
import type { Player } from '@/lib/data/types';

export type PickConfirmSheetProps = {
  visible: boolean;
  player: Player | null;
  teamSlot: number;
  teamNames: string[];
  isUserTurn: boolean;
  available?: Player[];
  onSelectPlayer?: (player: Player) => void;
  onChangeSlot: (slot: number) => void;
  onConfirm: () => void;
  onDismiss: () => void;
};

export const PickConfirmSheet = ({
  visible,
  player,
  teamSlot,
  teamNames,
  isUserTurn,
  available,
  onSelectPlayer,
  onChangeSlot,
  onConfirm,
  onDismiss,
}: PickConfirmSheetProps) => {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const label = isUserTurn ? 'YOUR PICK' : 'Log pick';
  const teamLabel = teamNames[teamSlot - 1] ?? `Team ${teamSlot}`;
  const filtered = useMemo(() => {
    if (!available) return [];
    const q = nameKey(query);
    if (!q) return available.slice(0, 40);
    return available.filter((p) => p.searchKey.includes(q)).slice(0, 40);
  }, [available, query]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => {
          setQuery('');
          onDismiss();
        }}
        contentContainerStyle={[styles.box, { backgroundColor: theme.colors.surface }]}
      >
        <Text variant="titleMedium">{player ? player.name : 'Confirm pick'}</Text>
        {player ? (
          <Text variant="bodyMedium">
            {player.position} · {player.team}
            {player.adp != null ? ` · ADP ${player.adp.toFixed(1)}` : ''}
          </Text>
        ) : available ? (
          <>
            <Searchbar placeholder="Search" value={query} onChangeText={setQuery} />
            <FlatList
              style={styles.list}
              data={filtered}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <List.Item
                  title={item.name}
                  description={`${item.position} · ${item.team}`}
                  onPress={() => onSelectPlayer?.(item)}
                />
              )}
            />
          </>
        ) : null}
        <Text variant="labelLarge" style={styles.fieldLabel}>
          Team
        </Text>
        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchor={
            <Button mode="outlined" onPress={() => setMenuOpen(true)}>
              {teamLabel}
            </Button>
          }
        >
          {teamNames.map((name, i) => (
            <Menu.Item
              key={name + String(i)}
              title={name}
              onPress={() => {
                onChangeSlot(i + 1);
                setMenuOpen(false);
              }}
            />
          ))}
        </Menu>
        <View style={styles.row}>
          <Button
            onPress={() => {
              setQuery('');
              onDismiss();
            }}
          >
            Cancel
          </Button>
          <Button mode="contained" onPress={onConfirm} disabled={!player}>
            {label}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  box: {
    margin: 24,
    padding: 20,
    borderRadius: 12,
    gap: 12,
    maxHeight: '85%',
  },
  list: { maxHeight: 240 },
  fieldLabel: { marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
