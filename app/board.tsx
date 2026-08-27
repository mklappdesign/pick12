import { StyleSheet, Text, View } from 'react-native';

const Board = () => {
  return (
    <View style={styles.center}>
      <Text>Board</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Board;
