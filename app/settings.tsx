import { StyleSheet, Text, View } from 'react-native';

const Settings = () => {
  return (
    <View style={styles.center}>
      <Text>Settings</Text>
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

export default Settings;
