// Bleeding day detail — /(tabs)/timeline/bleeding/[date]?from=<screen title>
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { BleedingDetail } from '../../../../components/zeeba/timeline/BleedingDetail';
import { fromLabel } from '../../../../components/zeeba/timeline/navigation';

export default function BleedingScreen() {
  const { date, from } = useLocalSearchParams<{ date: string; from?: string }>();
  return <BleedingDetail key={String(date)} date={String(date)} from={fromLabel(from)} />;
}
