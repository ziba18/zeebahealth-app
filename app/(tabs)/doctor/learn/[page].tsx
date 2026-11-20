// A reading page from "Before and after your appointment" (lib/learn/pages.ts). Fixed content, the same for
// everyone: this screen never reads her records and shows none of her data (see the rules in pages.ts).
import React from 'react';
import { Linking, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, space } from '../../../../constants/zeebaUI';
import { Button, Card, SafetyLine, ScreenLarge, Txt } from '../../../../components/zeeba/kit';
import { LEARN_NOTICE, learnPage, type LearnSource } from '../../../../lib/learn/pages';
import { usePageTitle } from '../../../../lib/usePageTitle';

const open = (url: string) => { Linking.openURL(url).catch(() => {}); };

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: space.xs }}>
      {items.map((b) => (
        <View key={b} style={{ flexDirection: 'row', gap: space.xs }}>
          <Txt variant="body" aria-hidden color={colors.ink3}>•</Txt>
          <Txt variant="body" style={{ flex: 1 }}>{b}</Txt>
        </View>
      ))}
    </View>
  );
}

function SourceLink({ s }: { s: LearnSource }) {
  return (
    <Txt
      variant="caption"
      accessibilityRole="link"
      onPress={() => open(s.url)}
      style={{ textDecorationLine: 'underline' }}
    >
      {s.label}
    </Txt>
  );
}

export default function LearnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ page: string }>();
  const page = learnPage(Array.isArray(params.page) ? params.page[0] : params.page);
  usePageTitle(page?.title ?? 'For my doctor');
  if (!page) return <Redirect href={'/(tabs)/doctor' as any} />;

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/doctor' as any);
  };

  return (
    <ScreenLarge title={page.title} back={{ label: 'For my doctor', onPress: back }}>
      <Txt variant="secondary" style={{ marginTop: space.xs }}>{LEARN_NOTICE}</Txt>

      <View style={{ gap: space.md, marginTop: space.lg }}>
        {page.blocks.map((b, i) => (
          <Card key={b.heading ?? `block-${i}`} style={{ gap: space.sm }}>
            {b.heading ? <Txt variant="headline" accessibilityRole="header">{b.heading}</Txt> : null}
            {b.lead ? <Txt variant="body">{b.lead}</Txt> : null}
            {b.bullets ? <Bullets items={b.bullets} /> : null}
            {b.text?.map((t) => <Txt key={t} variant={b.bullets ? 'secondary' : 'body'}>{t}</Txt>)}
          </Card>
        ))}
      </View>

      {page.links?.length ? (
        <View style={{ gap: space.xs, marginTop: space.xl }}>
          <Txt variant="groupLabel" accessibilityRole="header">Support and information</Txt>
          {page.links.map((l) => (
            <Button
              key={l.url}
              label={l.label}
              variant="secondary"
              icon="external-link"
              align="start"
              onPress={() => open(l.url)}
              accessibilityHint="Opens the website"
            />
          ))}
        </View>
      ) : null}

      <View style={{ gap: space.xxs, marginTop: space.xl }}>
        <Txt variant="groupLabel" accessibilityRole="header">Sources</Txt>
        {page.sources.map((s) => <SourceLink key={s.url} s={s} />)}
        <Txt variant="caption" style={{ marginTop: space.xs }}>
          Zeeba Health is your record, not medical advice. Talk to a doctor before making medical decisions.
        </Txt>
      </View>

      <SafetyLine style={{ marginTop: space.xl, marginBottom: space.xl }} />
    </ScreenLarge>
  );
}
