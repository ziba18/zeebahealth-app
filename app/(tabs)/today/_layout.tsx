import { Stack } from 'expo-router';
import { colors } from '../../../constants/zeebaUI';

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}
