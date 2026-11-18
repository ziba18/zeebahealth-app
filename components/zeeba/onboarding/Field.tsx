// The text field for sign-in and first-run screens: a clear label above, a big 56 pt well, a plain-word
// "Show" / "Hide" on passwords, and an error that says what to do in a full sentence.
import React, { forwardRef, useState } from 'react';
import {
  Platform, StyleSheet, TextInput, View,
  type StyleProp, type TextInputInstance, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { colors, font, space } from '../../../constants/zeebaUI';
import { Icon } from '../../ui/Icon';
import { Txt } from '../kit';
import { PressScale } from '../motion';

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  hint?: string;
  error?: string;
  /** A password: hidden until she taps "Show". */
  secret?: boolean;
  /** Hide the label visually (the question above already asks it); screen readers still get it. */
  hideLabel?: boolean;
  inputStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  onFocusChange?: (focused: boolean) => void;
} & Pick<
  TextInputProps,
  | 'placeholder' | 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'autoCorrect' | 'autoFocus' | 'returnKeyType'
  | 'onSubmitEditing' | 'textContentType' | 'maxLength' | 'inputMode' | 'submitBehavior'
>;

export const Field = forwardRef<TextInputInstance, Props>(function Field(
  { label, value, onChangeText, hint, error, secret, hideLabel, inputStyle, style, onFocusChange, ...input }, ref,
) {
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      {hideLabel ? null : <Txt style={styles.label}>{label}</Txt>}
      <View style={[styles.well, focused && styles.wellFocused, !!error && styles.wellError]}>
        <TextInput
          ref={ref}
          {...input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => { setFocused(true); onFocusChange?.(true); }}
          onBlur={() => { setFocused(false); onFocusChange?.(false); }}
          secureTextEntry={secret && !shown}
          placeholderTextColor={colors.borderStrong}
          accessibilityLabel={label}
          accessibilityHint={error || hint || undefined}
          style={[styles.input, inputStyle]}
        />
        {secret ? (
          <PressScale
            onPress={() => setShown((s) => !s)}
            haptic="none"
            accessibilityLabel={shown ? 'Hide password' : 'Show password'}
            style={styles.show}
          >
            <Icon name={shown ? 'eye-off' : 'eye'} size={20} color={colors.accent} />
            <Txt style={styles.showText}>{shown ? 'Hide' : 'Show'}</Txt>
          </PressScale>
        ) : null}
      </View>
      {error ? (
        <View style={styles.msg} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Icon name="alert-circle" size={18} color={colors.error} />
          <Txt style={styles.errorText}>{error}</Txt>
        </View>
      ) : hint ? (
        <Txt variant="caption" style={styles.hint}>{hint}</Txt>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { ...font.semibold, fontSize: 15, lineHeight: 20, color: colors.ink, marginBottom: space.xs, marginLeft: space.xxs },
  well: {
    minHeight: 56, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 2, borderColor: colors.hairline,
    backgroundColor: colors.surface, boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)',
  },
  wellFocused: { borderColor: colors.accent },
  wellError: { borderColor: colors.error },
  input: {
    flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: space.md, paddingVertical: space.sm,
    ...font.regular, fontSize: 17, color: colors.ink,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  show: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.xxs, paddingHorizontal: space.sm, marginRight: space.xxs },
  showText: { ...font.semibold, fontSize: 15, lineHeight: 20, color: colors.accent },
  msg: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: space.xs, marginLeft: space.xxs },
  errorText: { ...font.medium, fontSize: 15, lineHeight: 20, color: colors.error, flex: 1 },
  hint: { marginTop: space.xs, marginLeft: space.xxs },
});
