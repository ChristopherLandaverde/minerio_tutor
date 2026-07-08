/**
 * Secure secret storage via the OS keychain (Tauri `secret_*` commands).
 * Mirrors the getProfile/setProfile shape so it drops in for API keys.
 * No plaintext fallback: if the keychain is unreachable, these reject.
 */
import { invoke } from '@tauri-apps/api/core';

export async function getSecret(name: string): Promise<string | null> {
  return await invoke<string | null>('secret_get', { key: name });
}

export async function setSecret(name: string, value: string): Promise<void> {
  await invoke('secret_set', { key: name, value });
}

export async function deleteSecret(name: string): Promise<void> {
  await invoke('secret_delete', { key: name });
}
