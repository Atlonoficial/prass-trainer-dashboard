import { isUuid } from './validators';

export function normalizeIds(input: unknown): string[] {
  if (Array.isArray(input)) return input.map(String).filter(isUuid);
  if (typeof input === 'string') {
    const s = input.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String).filter(isUuid);
      } catch {}
    }
    return isUuid(s) ? [s] : [];
  }
  if (input && typeof input === 'object' && 'id' in (input as any)) {
    const v = String((input as any).id);
    return isUuid(v) ? [v] : [];
  }
  return [];
}