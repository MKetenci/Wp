/** Persists progress in localStorage, plus file export/import. */
import { sanitizeState } from './progress.js';

const KEY = 'wf-mastery:v1';

export function loadState(data) {
  try {
    return sanitizeState(JSON.parse(localStorage.getItem(KEY)), data);
  } catch {
    return sanitizeState(null, data);
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false; // private mode / storage full: the app still works for this session
  }
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `warframe-mastery-ilerleme-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function readImportFile(file, data) {
  const raw = JSON.parse(await file.text());
  return sanitizeState(raw, data);
}
