import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether the player has been through (or skipped) the guided first match.
 * Device-local on purpose: it should gate the tutorial even when offline, and
 * "I've seen the how-to" isn't progression worth a server round-trip.
 */
const KEY = 'blocade.v1.tutorialSeen';

export async function hasSeenTutorial(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    // storage failure → don't trap the player in a re-showing tutorial loop
    return true;
  }
}

export async function markTutorialSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // best-effort; worst case they see it once more next launch
  }
}
