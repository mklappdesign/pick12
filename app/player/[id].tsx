import { StyleSheet, Text, View } from 'react-native';

const Player = () => {
  return (
    <View style={styles.center}>
      <Text>Player</Text>
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

export default Player;
