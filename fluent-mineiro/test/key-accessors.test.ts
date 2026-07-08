import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSecret = vi.fn();
const setSecret = vi.fn();
const deleteSecret = vi.fn();

vi.mock('../src/lib/secrets', () => ({
  getSecret: (...a: unknown[]) => getSecret(...a),
  setSecret: (...a: unknown[]) => setSecret(...a),
  deleteSecret: (...a: unknown[]) => deleteSecret(...a),
}));
// Heavy Tauri imports pulled in transitively — stub so the modules load in node.
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }));
vi.mock('../src/lib/db', () => ({ getProfile: vi.fn(), setProfile: vi.fn(), deleteProfile: vi.fn() }));

import { getApiKey, setApiKey, clearApiKey } from '../src/lib/claude';
import { getElevenLabsKey, setElevenLabsKey, clearElevenLabsKey } from '../src/lib/elevenlabs';

beforeEach(() => {
  getSecret.mockReset();
  setSecret.mockReset();
  deleteSecret.mockReset();
  setSecret.mockResolvedValue(undefined);
  deleteSecret.mockResolvedValue(undefined);
});

describe('claude key accessors', () => {
  it('getApiKey reads the anthropic_api_key secret', async () => {
    getSecret.mockResolvedValue('sk-claude');
    expect(await getApiKey()).toBe('sk-claude');
    expect(getSecret).toHaveBeenCalledWith('anthropic_api_key');
  });
  it('setApiKey writes the anthropic_api_key secret', async () => {
    await setApiKey('sk-1');
    expect(setSecret).toHaveBeenCalledWith('anthropic_api_key', 'sk-1');
  });
  it('clearApiKey deletes the anthropic_api_key secret', async () => {
    await clearApiKey();
    expect(deleteSecret).toHaveBeenCalledWith('anthropic_api_key');
  });
});

describe('elevenlabs key accessors', () => {
  it('getElevenLabsKey reads the elevenlabs_api_key secret', async () => {
    getSecret.mockResolvedValue('el-1');
    expect(await getElevenLabsKey()).toBe('el-1');
    expect(getSecret).toHaveBeenCalledWith('elevenlabs_api_key');
  });
  it('setElevenLabsKey writes the elevenlabs_api_key secret', async () => {
    await setElevenLabsKey('el-2');
    expect(setSecret).toHaveBeenCalledWith('elevenlabs_api_key', 'el-2');
  });
  it('clearElevenLabsKey deletes the elevenlabs_api_key secret', async () => {
    await clearElevenLabsKey();
    expect(deleteSecret).toHaveBeenCalledWith('elevenlabs_api_key');
  });
});
