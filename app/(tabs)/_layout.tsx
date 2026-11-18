import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { MainTabBar } from '../../components/zeeba/MainTabBar';
import { CaptureSheet } from '../../components/zeeba/capture/CaptureSheet';
import { SaveFlight } from '../../components/zeeba/capture/SaveFlight';
import { MilestoneHost } from '../../components/zeeba/guide/MilestoneCelebration';
import { TourOverlay } from '../../components/zeeba/guide/TourOverlay';
import { showToast } from '../../components/zeeba/kit-parts/toast';
import { colors } from '../../constants/zeebaUI';
import { useAuthStore } from '../../stores/authStore';
import { useRecordsStore } from '../../stores/recordsStore';

export default function TabsLayout() {
  const userId = useAuthStore((s) => s.user?.id);
  const loadedFor = useRecordsStore((s) => s.loadedFor);

  // Keep the user's records in step with whoever is signed in.
  useEffect(() => {
    const store = useRecordsStore.getState();
    if (!userId) {
      store.reset();
      return;
    }
    if (loadedFor && loadedFor !== userId) store.reset();
    if (loadedFor !== userId) store.load(userId);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Offline: the screen shows the copy kept on this phone. Say so once, then keep trying the server quietly.
  const stale = useRecordsStore((s) => s.stale);
  useEffect(() => {
    if (!stale || !userId) return;
    showToast('No connection. Showing what is saved on this phone.');
    const refresh = () => { void useRecordsStore.getState().load(userId, { quiet: true }); };
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 30000);
    if (Platform.OS === 'web') globalThis.addEventListener?.('online', refresh);
    return () => {
      sub.remove();
      clearInterval(timer);
      if (Platform.OS === 'web') globalThis.removeEventListener?.('online', refresh);
    };
  }, [stale, userId]);

  // Send notes saved offline when the app returns to the foreground or the browser comes back online.
  useEffect(() => {
    const flush = () => { void useRecordsStore.getState().flushOutbox(); };
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') flush(); });
    if (Platform.OS === 'web') globalThis.addEventListener?.('online', flush);
    return () => {
      sub.remove();
      if (Platform.OS === 'web') globalThis.removeEventListener?.('online', flush);
    };
  }, []);

  return (
    <>
    <Tabs tabBar={(props) => <MainTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }}>
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="timeline" options={{ title: 'Evidence' }} />
      <Tabs.Screen name="doctor" options={{ title: 'For my doctor' }} />
      {/* Reached from the avatar (HeaderAvatar) top-right on every tab; MainTabBar only draws VISIBLE_TABS. No href:null, which sent web back to Today. */}
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
    <CaptureSheet />
    {/* The save moment (a chip flies to the Doctor tab), milestones of the record, and Wren's first-visit tour. */}
    <SaveFlight />
    <MilestoneHost />
    <TourOverlay />
    </>
  );
}
