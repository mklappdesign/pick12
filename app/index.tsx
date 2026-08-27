import { StyleSheet, Text, View } from 'react-native';

const Setup = () => {
  return (
    <View style={styles.center}>
      <Text>Setup</Text>
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

export default Setup;
