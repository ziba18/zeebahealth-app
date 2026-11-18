// Preview-only gallery of the clay icons, for design review (npm run preview:web, then /art-lab).
// Never reachable in a real build.
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Txt } from '../components/zeeba/kit';
import { ClayIcon, type ClayIconName } from '../components/zeeba/art/ClayIcon';
import { colors, space } from '../constants/zeebaUI';
import { IS_PREVIEW } from '../lib/preview/flag';

const NAMES: ClayIconName[] = ['record', 'prove', 'reach', 'bell', 'calendar', 'lock', 'heart', 'pencil', 'sparkle', 'doctor', 'moon', 'sun'];

export default function ArtLab() {
  if (!IS_PREVIEW) return <Redirect href="/" />;
  const row = { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' } as const;
  const card = { backgroundColor: colors.surface, borderRadius: 20, padding: space.md, alignSelf: 'stretch' } as const;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ padding: space.md, gap: space.md, alignItems: 'center' }}>
      <Txt variant="title">Clay icons</Txt>
      <View style={[row, { gap: 2 }]}>
        {NAMES.map((n) => (
          <View key={n} style={{ alignItems: 'center', width: 120 }}>
            <ClayIcon name={n} size={120} />
            <Txt variant="caption">{n}</Txt>
          </View>
        ))}
      </View>
      <View style={[row, card, { gap: space.sm }]}>
        {NAMES.map((n) => <ClayIcon key={n} name={n} size={64} />)}
      </View>
      <View style={[row, card, { gap: space.sm }]}>
        {NAMES.map((n) => <ClayIcon key={n} name={n} size={40} />)}
      </View>
      <View style={[row, { gap: space.sm }]}>
        {NAMES.map((n) => <ClayIcon key={n} name={n} size={40} />)}
      </View>
    </ScrollView>
  );
}
