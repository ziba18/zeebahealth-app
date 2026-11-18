// Three tiny skies for the reminder times: sunrise, midday, night. Fixed colours (pictures, like Wren and the
// ClayIcons), so they look the same in light and dark. Decorative: the label beside them says the time.
import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

const SKY: Record<TimeOfDay, [string, string]> = {
  morning: ['#FFC9A3', '#FF9FB6'],
  afternoon: ['#6DBDF2', '#BFE6FF'],
  evening: ['#2A2C63', '#5A3F87'],
};

const STAR = 'M0 -3.2 L0.9 -0.9 L3.2 0 L0.9 0.9 L0 3.2 L-0.9 0.9 L-3.2 0 L-0.9 -0.9 Z';

export function TimeArt({ time, size = 48 }: { time: TimeOfDay; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [top, bottom] = SKY[time];
  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={top} /><Stop offset="1" stopColor={bottom} />
          </LinearGradient>
          <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFF3C4" /><Stop offset="1" stopColor="#FFB93B" />
          </LinearGradient>
          <ClipPath id={`${id}c`}><Rect x={0} y={0} width={48} height={48} rx={15} /></ClipPath>
        </Defs>
        <G clipPath={`url(#${id}c)`}>
          <Rect x={0} y={0} width={48} height={48} fill={`url(#${id}s)`} />
          {time === 'morning' ? (
            <>
              <Circle cx={24} cy={35} r={17} fill="#FFFFFF" opacity={0.22} />
              <Circle cx={24} cy={35} r={11} fill={`url(#${id}g)`} />
              <Path d="M0 35 H48 V48 H0 Z" fill="#F0719A" />
              <Path d="M0 35 H48" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.2} />
              <Path d="M10 41 H22 M27 44 H38" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" />
            </>
          ) : time === 'afternoon' ? (
            <>
              <Circle cx={25} cy={21} r={16} fill="#FFFFFF" opacity={0.25} />
              <Circle cx={25} cy={21} r={10.5} fill={`url(#${id}g)`} />
              <Path d="M5 40 a6 6 0 0 1 8 -5 a8 8 0 0 1 15 2 a5 5 0 0 1 3 9 H8 a5 5 0 0 1 -3 -6 Z" fill="#FFFFFF" opacity={0.95} />
            </>
          ) : (
            <>
              <Path d="M27 11 A13 13 0 1 0 38.5 29.5 A10.8 10.8 0 1 1 27 11 Z" fill="#FFE9A6" />
              <G fill="#FFFFFF">
                <Path d={STAR} transform="translate(12 13)" opacity={0.95} />
                <Path d={STAR} transform="translate(38 14) scale(0.7)" opacity={0.8} />
                <Path d={STAR} transform="translate(11 34) scale(0.6)" opacity={0.7} />
              </G>
            </>
          )}
        </G>
      </Svg>
    </View>
  );
}
