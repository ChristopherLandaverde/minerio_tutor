/**
 * One-time migration of plaintext API keys from the SQLite `profile` table
 * into the OS keychain. Idempotent and failure-safe: a plaintext row is only
 * deleted after its secret write succeeds, and the completion flag is only set
 * after the whole pass succeeds. If the keychain is unreachable, nothing is
 * lost and the migration retries on the next launch.
 */
import { getProfile, setProfile, deleteProfile } from './db';
import { setSecret } from './secrets';

// [old plaintext profile key, new keychain account name]
const KEYS: readonly [string, string][] = [
  ['api_key', 'anthropic_api_key'],
  ['elevenlabs_key', 'elevenlabs_api_key'],
];

export async function migrateSecrets(): Promise<void> {
  if ((await getProfile('secrets_migrated')) === '1') return;

  for (const [oldKey, newName] of KEYS) {
    const value = await getProfile(oldKey);
    if (value && value.length > 0) {
      await setSecret(newName, value); // throws if keychain unreachable → abort
      await deleteProfile(oldKey);     // only runs after a successful write
    }
  }

  await setProfile('secrets_migrated', '1'); // only after the full pass succeeds
}
