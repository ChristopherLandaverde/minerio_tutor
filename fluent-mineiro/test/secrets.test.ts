import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

import { getSecret, setSecret, deleteSecret } from '../src/lib/secrets';

beforeEach(() => invokeMock.mockReset());

describe('secrets wrapper', () => {
  it('getSecret returns the value from invoke', async () => {
    invokeMock.mockResolvedValue('sk-abc');
    expect(await getSecret('anthropic_api_key')).toBe('sk-abc');
    expect(invokeMock).toHaveBeenCalledWith('secret_get', { key: 'anthropic_api_key' });
  });

  it('getSecret returns null when invoke returns null', async () => {
    invokeMock.mockResolvedValue(null);
    expect(await getSecret('anthropic_api_key')).toBeNull();
  });

  it('setSecret forwards key and value', async () => {
    invokeMock.mockResolvedValue(undefined);
    await setSecret('anthropic_api_key', 'sk-1');
    expect(invokeMock).toHaveBeenCalledWith('secret_set', { key: 'anthropic_api_key', value: 'sk-1' });
  });

  it('deleteSecret forwards key', async () => {
    invokeMock.mockResolvedValue(undefined);
    await deleteSecret('elevenlabs_api_key');
    expect(invokeMock).toHaveBeenCalledWith('secret_delete', { key: 'elevenlabs_api_key' });
  });
});
