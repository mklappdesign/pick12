import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildSnapshot, validateSnapshot } from './buildSnapshot';
import type { Snapshot } from './types';

export const SNAPSHOT_KEY = '@pick12/snapshot';

export const loadSnapshot = async (): Promise<{ snapshot: Snapshot; source: 'stored' | 'bundled' }> => {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Snapshot;
      validateSnapshot(parsed);
      return { snapshot: parsed, source: 'stored' };
    }
  } catch {
    // miss or parse/validation failure → bundled
  }
  const bundled = require('../../assets/snapshot.json') as Snapshot;
  return { snapshot: bundled, source: 'bundled' };
};

export const saveSnapshot = async (s: Snapshot): Promise<void> => {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s));
};

export const refreshSnapshot = async (): Promise<
  { ok: true; snapshot: Snapshot } | { ok: false; error: string; snapshot: Snapshot }
> => {
  const current = await loadSnapshot();
  try {
    const next = await buildSnapshot();
    validateSnapshot(next);
    await saveSnapshot(next);
    return { ok: true, snapshot: next };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      snapshot: current.snapshot,
    };
  }
};
