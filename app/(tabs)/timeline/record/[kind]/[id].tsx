import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { RecordDetail } from '../../../../../components/zeeba/records/RecordDetail';
import { safeBackLabel } from '../../../../../components/zeeba/timeline/navigation';
import { firstParam, toDataKind } from '../../../../../components/zeeba/records/recordKinds';

/**
 * Appointment / medicine / health-history detail opened from Timeline (owned by Profile+Records;
 * Timeline links here via recordHref). Back — and Save / Delete — return to Timeline.
 */
export default function TimelineRecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind: string; id: string; from?: string }>();
  const kind = toDataKind(params.kind);
  if (!kind) return <Redirect href={'/(tabs)/timeline' as any} />;
  const backLabel = safeBackLabel(params.from);

  const done = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/(tabs)/timeline' as any);
  };

  return <RecordDetail kind={kind} id={firstParam(params.id)} backLabel={backLabel} onDone={done} />;
}
