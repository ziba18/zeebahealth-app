// Preview-only gallery of Wren's moods, for design review (npm run preview:web, then /wren-lab).
// Never reachable in a real build.
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Button, Txt } from '../components/zeeba/kit';
import { Confetti, CountUp, ProgressSteps, Pulse, WrenSays } from '../components/zeeba/motion';
import { Wren, type WrenMood } from '../components/zeeba/Wren';
import { colors, space } from '../constants/zeebaUI';
import { IS_PREVIEW } from '../lib/preview/flag';

const MOODS: WrenMood[] = ['idle', 'happy', 'wave', 'proud', 'point', 'listening', 'thinking', 'comfort', 'sleepy'];

export default function WrenLab() {
  const [mood, setMood] = useState<WrenMood>('wave');
  const [fire, setFire] = useState(0);
  if (!IS_PREVIEW) return <Redirect href="/" />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ padding: space.lg, gap: space.lg, alignItems: 'center' }}>
      <Txt variant="title">Wren</Txt>
      <WrenSays text="What should I call you?" mood="wave" size={92} style={{ alignSelf: 'stretch' }} />
      <WrenSays text="You’re set. Your record starts today." mood="proud" side="top" size={130} />
      <ProgressSteps total={5} current={2} style={{ alignSelf: 'stretch' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <CountUp value={23} />
        <Pulse><Button label="Celebrate" onPress={() => setFire((n) => n + 1)} /></Pulse>
      </View>
      <Confetti fire={fire} />
      <Wren mood={mood} size={220} interactive />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' }}>
        {MOODS.map((m) => (
          <View key={m} style={{ alignItems: 'center', width: 104 }}>
            <Wren mood={m} size={96} onPress={() => setMood(m)} />
            <Txt variant="caption">{m}</Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
        <Wren mood="happy" size={56} decorative />
        <Wren mood="proud" size={40} decorative />
        <Wren mood="point" pointAt="left" size={72} decorative />
        <Wren mood="point" pointAt="up" size={72} decorative />
        <Wren mood="point" pointAt="down" size={72} decorative />
      </View>
    </ScrollView>
  );
}
