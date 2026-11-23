// The pain body map (23 Nov 2026, owner): ChatGPT's front + back figure, kept exactly as drawn, with its grouped
// regions made tappable. She taps a part of the body; that part turns the pain colour and its plain name is added
// to the note's zones ("Lower tummy", "Left hip"). Tap again to take it off.
// How it works: lib/records/bodyMapData.ts holds a small grid that says which region each point of the picture
// belongs to, and one cut-out per region to colour it in. Nothing is drawn by hand.
// Later version (owner asked to be reminded): free painting, a dot or a filled area anywhere on the body.
import React, { useMemo, useState } from 'react';
import { Image, Pressable, View, type GestureResponderEvent } from 'react-native';
import { BODY_ASPECT, BODY_IMAGE, BODY_REGIONS, GRID, GRID_H, GRID_W } from '../../../lib/records/bodyMapData';
import { haptics } from '../../../lib/haptics';

/** Every name the map can give, front first, without repeats. */
export const BODY_MAP_NAMES: string[] = [...new Set(
  [...BODY_REGIONS].sort((a, b) => (a.view === b.view ? a.y - b.y : a.view === 'front' ? -1 : 1)).map((r) => r.name),
)];

const NAME_BY_ID = new Map(BODY_REGIONS.map((r) => [r.id, r.name]));

/** The region at a point of the picture (0–1 across, 0–1 down). Looks a little around the point for thin lines. */
function regionAt(fx: number, fy: number): string | null {
  const cx = Math.floor(fx * GRID_W);
  const cy = Math.floor(fy * GRID_H);
  for (let reach = 0; reach <= 2; reach++) {
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== reach) continue;
        const row = GRID[cy + dy];
        const id = row ? row.charCodeAt(cx + dx) - 48 : NaN;
        if (id > 0 && NAME_BY_ID.has(id)) return NAME_BY_ID.get(id)!;
      }
    }
  }
  return null;
}

export function BodyMap({ value, onToggle }: { value: string[]; onToggle: (name: string) => void }) {
  const [width, setWidth] = useState(0);
  const height = width / BODY_ASPECT;
  const on = useMemo(() => new Set(value), [value]);
  const chosen = BODY_MAP_NAMES.filter((n) => on.has(n));

  const press = (e: GestureResponderEvent) => {
    if (!width) return;
    // Native gives locationX/Y; in a browser a click gives offsetX/Y (both are measured from this view,
    // because the pictures inside it take no touches).
    const ne = e.nativeEvent as unknown as { locationX?: number; locationY?: number; offsetX?: number; offsetY?: number };
    const x = ne.locationX ?? ne.offsetX;
    const y = ne.locationY ?? ne.offsetY;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    const name = regionAt(x / width, y / height);
    if (!name) return;
    haptics.selection();
    onToggle(name);
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ alignSelf: 'center', width: '100%', maxWidth: 420 }}>
      <Pressable
        onPress={press}
        accessibilityRole="image"
        accessibilityLabel={
          `Body map, front and back. ${chosen.length ? `Marked: ${chosen.join(', ')}.` : 'Nothing marked yet.'} You can also pick from the list below.`
        }
        style={{ width: '100%', height: height || undefined, aspectRatio: height ? undefined : BODY_ASPECT }}
      >
        <View style={{ flex: 1, pointerEvents: 'none' }}>
          <Image source={BODY_IMAGE} resizeMode="contain" style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
          {width
            ? BODY_REGIONS.filter((r) => on.has(r.name)).map((r) => (
              <Image
                key={r.id}
                source={r.source}
                resizeMode="stretch"
                style={{ position: 'absolute', left: r.x * width, top: r.y * height, width: r.w * width, height: r.h * height }}
              />
            ))
            : null}
        </View>
      </Pressable>
    </View>
  );
}

export default BodyMap;
