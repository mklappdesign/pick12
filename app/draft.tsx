import { StyleSheet, Text, View } from 'react-native';

const Draft = () => {
  return (
    <View style={styles.center}>
      <Text>Draft</Text>
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

export default Draft;
