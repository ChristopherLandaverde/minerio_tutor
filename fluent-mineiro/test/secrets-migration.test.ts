import { describe, it, expect, vi, beforeEach } from 'vitest';

const getProfile = vi.fn();
const setProfile = vi.fn();
const deleteProfile = vi.fn();
const setSecret = vi.fn();

vi.mock('../src/lib/db', () => ({
  getProfile: (...a: unknown[]) => getProfile(...a),
  setProfile: (...a: unknown[]) => setProfile(...a),
  deleteProfile: (...a: unknown[]) => deleteProfile(...a),
}));
vi.mock('../src/lib/secrets', () => ({
  setSecret: (...a: unknown[]) => setSecret(...a),
}));

import { migrateSecrets } from '../src/lib/secrets-migration';

beforeEach(() => {
  getProfile.mockReset();
  setProfile.mockReset();
  deleteProfile.mockReset();
  setSecret.mockReset();
  setProfile.mockResolvedValue(undefined);
  deleteProfile.mockResolvedValue(undefined);
  setSecret.mockResolvedValue(undefined);
});

describe('migrateSecrets', () => {
  it('does nothing when already migrated', async () => {
    getProfile.mockResolvedValueOnce('1'); // secrets_migrated
    await migrateSecrets();
    expect(setSecret).not.toHaveBeenCalled();
    expect(deleteProfile).not.toHaveBeenCalled();
    expect(setProfile).not.toHaveBeenCalled();
  });

  it('moves both keys, deletes plaintext, sets the flag', async () => {
    getProfile
      .mockResolvedValueOnce(null)        // secrets_migrated
      .mockResolvedValueOnce('sk-claude') // api_key
      .mockResolvedValueOnce('el-key');   // elevenlabs_key
    await migrateSecrets();
    expect(setSecret).toHaveBeenCalledWith('anthropic_api_key', 'sk-claude');
    expect(setSecret).toHaveBeenCalledWith('elevenlabs_api_key', 'el-key');
    expect(deleteProfile).toHaveBeenCalledWith('api_key');
    expect(deleteProfile).toHaveBeenCalledWith('elevenlabs_key');
    expect(setProfile).toHaveBeenCalledWith('secrets_migrated', '1');
  });

  it('skips empty/absent keys but still sets the flag', async () => {
    getProfile
      .mockResolvedValueOnce(null) // secrets_migrated
      .mockResolvedValueOnce(null) // api_key absent
      .mockResolvedValueOnce('');  // elevenlabs_key empty
    await migrateSecrets();
    expect(setSecret).not.toHaveBeenCalled();
    expect(deleteProfile).not.toHaveBeenCalled();
    expect(setProfile).toHaveBeenCalledWith('secrets_migrated', '1');
  });

  it('leaves plaintext and flag intact when setSecret throws', async () => {
    getProfile
      .mockResolvedValueOnce(null)         // secrets_migrated
      .mockResolvedValueOnce('sk-claude'); // api_key
    setSecret.mockRejectedValueOnce(new Error('keychain unreachable'));
    await expect(migrateSecrets()).rejects.toThrow('keychain unreachable');
    expect(deleteProfile).not.toHaveBeenCalled();
    expect(setProfile).not.toHaveBeenCalled();
  });
});
