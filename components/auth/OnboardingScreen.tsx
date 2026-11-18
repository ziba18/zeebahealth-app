// One question per screen, asked by Wren.
//   top bar    Back (not on the first question) · segmented progress · "2 of 4"
//   Wren       at the side with a speech bubble that asks the question; the mood changes as she answers
//   answers    whatever the screen passes as children (big cards, a field, the calendar)
//   bottom     the main button, pinned, always in the same place
// Before the first question Wren says hello and how many questions there are (once per sign-up).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { colors, font, space } from '../../constants/zeebaUI';
import { Txt } from '../zeeba/kit';
import { Pop, ProgressSteps, Rise, WrenSays } from '../zeeba/motion';
import type { WrenMood, WrenPointAt } from '../zeeba/Wren';
import { BigButton, FlowScreen, useUsableHeight } from '../zeeba/onboarding/Scaffold';
import { hasGreeted, markGreeted, questionStep, type QuestionKey } from '../zeeba/onboarding/flow';
import { usePageTitle } from '../../lib/usePageTitle';

const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five'];

/** The short hello before the first question: Wren waves and says how many questions there are. */
function WrenHello({ total, onStart }: { total: number; onStart: () => void }) {
  const short = useUsableHeight() < 700;
  return (
    <FlowScreen
      glow="full"
      scroll={false}
      footer={<BigButton label="Let’s start" onPress={onStart} />}
    >
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.hello}>
        <Pop>
          <WrenSays
            side="top"
            mood="wave"
            size={short ? 150 : 190}
            text="Hello, I’m Wren."
            textVariant="title"
            header
            bubbleStyle={styles.helloBubble}
          >
            <Txt variant="body" color={colors.ink2} style={styles.center}>
              {`Just ${NUMBER_WORDS[total] ?? total} quick questions, then your record is ready.`}
            </Txt>
          </WrenSays>
        </Pop>
      </View>
    </FlowScreen>
  );
}

export function OnboardingScreen({
  question, ask, hint, mood = 'idle', pointAt, back = true, children, footer,
}: {
  /** Which question this is; the step number and total come from it. */
  question: QuestionKey;
  /** Wren's question: short, plain, one sentence. It is the screen's heading. */
  ask: string;
  /** A quieter second line in the bubble (what to do, or a word back once she has answered). */
  hint?: string;
  mood?: WrenMood;
  pointAt?: WrenPointAt;
  /** Show Back. Ignored on the first question (there is nothing to go back to). */
  back?: boolean;
  children: React.ReactNode;
  /** The pinned bottom bar: the main button, with any error above it. */
  footer: React.ReactNode;
}) {
  const { step, total, first } = questionStep(question);
  const [greeted, setGreeted] = useState(() => !first || hasGreeted());
  const short = useUsableHeight() < 700;
  usePageTitle(ask);

  if (!greeted) {
    return <WrenHello total={total} onStart={() => { markGreeted(); setGreeted(true); }} />;
  }

  const showBack = back && !first;
  return (
    <FlowScreen
      back={showBack}
      top={<ProgressSteps total={total} current={step} />}
      right={<Txt style={styles.count} accessibilityLabel={`Question ${step} of ${total}`}>{`${step} of ${total}`}</Txt>}
      footer={footer}
    >
      {showBack ? null : <Stack.Screen options={{ gestureEnabled: false }} />}
      <Rise>
        <WrenSays
          text={ask}
          mood={mood}
          pointAt={pointAt}
          size={short ? 72 : 92}
          textVariant="hero"
          header
          style={styles.wren}
          bubbleStyle={styles.bubble}
        >
          {hint ? <Txt variant="secondary" accessibilityLiveRegion="polite">{hint}</Txt> : null}
        </WrenSays>
      </Rise>
      {children}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  hello: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: space.xl },
  helloBubble: { alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg, maxWidth: 320 },
  center: { textAlign: 'center' },
  count: { ...font.semibold, fontSize: 15, lineHeight: 20, color: colors.ink2, fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'right' },
  wren: { marginTop: space.xxs, marginBottom: space.md, marginLeft: -space.xs },
  bubble: { paddingVertical: space.sm + 2, gap: space.xxs },
});
