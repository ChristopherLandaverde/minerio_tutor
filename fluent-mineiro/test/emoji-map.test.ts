import { describe, it, expect } from 'vitest';
import { lookupEmoji } from '../src/lib/emoji-map';

describe('lookupEmoji', () => {
  it('maps a known concrete noun', () => {
    expect(lookupEmoji('pão de queijo')).toBe('🧀');
  });
  it('is case- and accent-insensitive', () => {
    expect(lookupEmoji('PÃO DE QUEIJO')).toBe('🧀');
    expect(lookupEmoji('pao de queijo')).toBe('🧀');
    expect(lookupEmoji('  cafezinho  ')).toBe('☕');
  });
  it('returns null for an unmapped word', () => {
    expect(lookupEmoji('saudade')).toBeNull();
    expect(lookupEmoji('')).toBeNull();
  });
});
