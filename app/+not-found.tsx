import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, layout, space } from '../constants/zeebaUI';
import { Button } from '../components/zeeba/kit';
import { WrenSays } from '../components/zeeba/motion';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: layout.gutter + space.xs, gap: space.xxl, maxWidth: layout.maxContentWidth, width: '100%', alignSelf: 'center' }}>
        <WrenSays side="top" size={150} mood="thinking" header text="That page isn’t here. Let’s go back." />
        <View style={{ gap: space.xs }}>
          <Button label="Go to Today" onPress={() => router.replace('/(tabs)/today' as any)} />
          <Button label="Go back" variant="text" onPress={() => router.back()} />
        </View>
      </View>
    </SafeAreaView>
  );
}
