import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, List, Modal, Portal, Searchbar, Text, useTheme } from 'react-native-paper';

import { nameKey } from '@/lib/data/normalizeName';
import type { Player } from '@/lib/data/types';

export type CellEditSheetProps = {
  visible: boolean;
  overall: number;
  available: Player[];
  onEdit: (playerId: string | null) => void;
  onDismiss: () => void;
};

export const CellEditSheet = ({
  visible,
  overall,
  available,
  onEdit,
  onDismiss,
}: CellEditSheetProps) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = nameKey(query);
    if (!q) return available;
    return available.filter((p) => p.searchKey.includes(q));
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
        <Text variant="titleMedium">Edit pick #{overall}</Text>
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
              onPress={() => {
                setQuery('');
                onEdit(item.id);
              }}
            />
          )}
        />
        <View style={styles.row}>
          <Button
            onPress={() => {
              setQuery('');
              onEdit(null);
            }}
          >
            Remove
          </Button>
          <Button onPress={onDismiss}>Cancel</Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  box: {
    margin: 24,
    padding: 16,
    borderRadius: 12,
    maxHeight: '80%',
    gap: 8,
  },
  list: { maxHeight: 360 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
