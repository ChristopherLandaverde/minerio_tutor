# API Keys → OS Keychain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Claude and ElevenLabs API keys out of plaintext SQLite into the OS keychain, with a one-time, failure-safe migration and no plaintext fallback.

**Architecture:** A tiny Rust module exposes three Tauri commands (`secret_get/set/delete`) backed by the `keyring` crate (OS-native secret store). A frontend `secrets.ts` wraps them and mirrors the existing `getProfile/setProfile` shape, so `claude.ts` and `elevenlabs.ts` swap internals without changing their public functions. On startup, a guarded one-time migration moves existing plaintext keys into the keychain and hard-deletes the plaintext rows.

**Tech Stack:** Tauri v2 (Rust), `keyring` crate v3, SvelteKit + TypeScript, vitest, `@tauri-apps/api/core` `invoke`.

## Global Constraints

- Package manager: **npm** (`package-lock.json`). Frontend commands run from `fluent-mineiro/`.
- Rust commands run from `fluent-mineiro/` using `--manifest-path src-tauri/Cargo.toml`.
- Keychain service name (verbatim): `com.christopherlandaverde.sabia` (matches `tauri.conf.json` identifier).
- Secret account names (verbatim): `anthropic_api_key`, `elevenlabs_api_key`.
- `keyring` crate: `version = "3"`, features `sync-secret-service`, `crypto-rust`, `apple-native`, `windows-native`. The Linux backend (`sync-secret-service` + `crypto-rust`) is pure Rust (zbus + RustCrypto) — **no system libsecret/dbus dev headers required** to build.
- Tests: frontend at `fluent-mineiro/test/**/*.test.ts` (vitest, node env); Rust inline `#[cfg(test)]`.
- **No silent fallback to plaintext, ever.** If the keychain is unreachable, surface an error; never write a key back to SQLite.
- Work happens on branch `feat/api-keys-keychain` (already created; contains the spec commit).
- Spec: `docs/superpowers/specs/2026-07-01-api-keys-os-keychain-design.md`.

---

### Task 1: Rust keyring bridge

**Files:**
- Modify: `fluent-mineiro/src-tauri/Cargo.toml` (add `keyring` dep + dev-dep)
- Create: `fluent-mineiro/src-tauri/src/secrets.rs`
- Modify: `fluent-mineiro/src-tauri/src/lib.rs:1` (add `mod secrets;`) and `:129` (add `.invoke_handler(...)`)

**Interfaces:**
- Produces (Tauri commands, callable via `invoke`):
  - `secret_get(key: String) -> Result<Option<String>, String>` — missing entry → `Ok(None)`
  - `secret_set(key: String, value: String) -> Result<(), String>`
  - `secret_delete(key: String) -> Result<(), String>` — missing entry → `Ok(())`

- [ ] **Step 1: Add the keyring dependency**

In `fluent-mineiro/src-tauri/Cargo.toml`, add to the `[dependencies]` section (after the `tauri-plugin-http = "2"` line):

```toml
keyring = { version = "3", default-features = false, features = ["sync-secret-service", "crypto-rust", "apple-native", "windows-native"] }
```

Then add a new `[dev-dependencies]` section at the end of the file (enables the in-memory mock backend for tests only):

```toml
[dev-dependencies]
keyring = { version = "3", default-features = false, features = ["mock"] }
```

- [ ] **Step 2: Write the Rust command module with failing tests**

Create `fluent-mineiro/src-tauri/src/secrets.rs`:

```rust
//! OS keychain bridge. Stores secrets (API keys) in the platform secret store
//! via the `keyring` crate: Secret Service on Linux, Keychain on macOS,
//! Credential Manager on Windows. No plaintext fallback.

use keyring::Entry;

const SERVICE: &str = "com.christopherlandaverde.sabia";

/// Read a secret. Returns Ok(None) when no entry exists.
#[tauri::command]
pub fn secret_get(key: String) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Create or overwrite a secret.
#[tauri::command]
pub fn secret_set(key: String, value: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE, &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

/// Delete a secret. Deleting a missing entry is a no-op success.
#[tauri::command]
pub fn secret_delete(key: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Once;

    static INIT: Once = Once::new();

    // Install the in-memory mock backend once, before any Entry is created.
    // Each test uses a unique key so the shared mock store can't cross-talk.
    fn init_mock() {
        INIT.call_once(|| {
            keyring::set_default_credential_builder(keyring::mock::default_credential_builder());
        });
    }

    #[test]
    fn set_then_get_roundtrips() {
        init_mock();
        secret_set("t1_anthropic_api_key".into(), "sk-abc".into()).unwrap();
        assert_eq!(secret_get("t1_anthropic_api_key".into()).unwrap(), Some("sk-abc".to_string()));
    }

    #[test]
    fn get_missing_returns_none() {
        init_mock();
        assert_eq!(secret_get("t2_never_set".into()).unwrap(), None);
    }

    #[test]
    fn delete_removes_entry_and_missing_delete_is_ok() {
        init_mock();
        secret_set("t3_key".into(), "v".into()).unwrap();
        secret_delete("t3_key".into()).unwrap();
        assert_eq!(secret_get("t3_key".into()).unwrap(), None);
        // deleting again must not error
        secret_delete("t3_key".into()).unwrap();
    }
}
```

- [ ] **Step 3: Run the Rust tests to verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml secrets`
Expected: FAIL — the module isn't compiled into the crate yet (`error[E0583]: file not found for module secrets` once referenced, or the test binary doesn't see the module). Wire it up next.

- [ ] **Step 4: Register the module and commands in `lib.rs`**

In `fluent-mineiro/src-tauri/src/lib.rs`, add at the very top (line 1, above the existing `use tauri_plugin_sql...`):

```rust
mod secrets;
```

Then in the builder chain, insert the invoke handler immediately before `.run(tauri::generate_context!())` (currently line 129):

```rust
        .invoke_handler(tauri::generate_handler![
            secrets::secret_get,
            secrets::secret_set,
            secrets::secret_delete
        ])
        .run(tauri::generate_context!())
```

- [ ] **Step 5: Run the Rust tests to verify they pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml secrets`
Expected: PASS — `test result: ok. 3 passed`.

- [ ] **Step 6: Verify the release build links keyring on Linux (no system deps)**

Run: `cargo build --manifest-path src-tauri/Cargo.toml`
Expected: builds successfully (pure-Rust Secret Service backend; no libsecret needed).

- [ ] **Step 7: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/secrets.rs src-tauri/src/lib.rs
git commit -m "feat(secrets): add keyring-backed secret_get/set/delete Tauri commands"
```

---

### Task 2: Frontend secret wrapper + profile delete helper

**Files:**
- Create: `fluent-mineiro/src/lib/secrets.ts`
- Modify: `fluent-mineiro/src/lib/db.ts:25` (add `deleteProfile` after `setProfile`)
- Test: `fluent-mineiro/test/secrets.test.ts`

**Interfaces:**
- Consumes: Tauri commands `secret_get/set/delete` from Task 1.
- Produces:
  - `getSecret(name: string): Promise<string | null>`
  - `setSecret(name: string, value: string): Promise<void>`
  - `deleteSecret(name: string): Promise<void>`
  - `deleteProfile(key: string): Promise<void>` (in `db.ts`)

- [ ] **Step 1: Write the failing test**

Create `fluent-mineiro/test/secrets.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- test/secrets.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/secrets'`.

- [ ] **Step 3: Implement `secrets.ts`**

Create `fluent-mineiro/src/lib/secrets.ts`:

```ts
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
```

- [ ] **Step 4: Add `deleteProfile` to `db.ts`**

In `fluent-mineiro/src/lib/db.ts`, add immediately after the `setProfile` function (after line 25):

```ts
export async function deleteProfile(key: string): Promise<void> {
  const d = await getDb();
  await d.execute('DELETE FROM profile WHERE key = $1', [key]);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test -- test/secrets.test.ts`
Expected: PASS — 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/secrets.ts src/lib/db.ts test/secrets.test.ts
git commit -m "feat(secrets): add getSecret/setSecret/deleteSecret wrapper + deleteProfile"
```

---

### Task 3: One-time migration

**Files:**
- Create: `fluent-mineiro/src/lib/secrets-migration.ts`
- Test: `fluent-mineiro/test/secrets-migration.test.ts`

**Interfaces:**
- Consumes: `getProfile`, `setProfile`, `deleteProfile` (`db.ts`); `setSecret` (`secrets.ts`).
- Produces: `migrateSecrets(): Promise<void>` — idempotent; guarded by the `secrets_migrated` profile flag.

- [ ] **Step 1: Write the failing test**

Create `fluent-mineiro/test/secrets-migration.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- test/secrets-migration.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/secrets-migration'`.

- [ ] **Step 3: Implement `secrets-migration.ts`**

Create `fluent-mineiro/src/lib/secrets-migration.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- test/secrets-migration.test.ts`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/secrets-migration.ts test/secrets-migration.test.ts
git commit -m "feat(secrets): one-time failure-safe migration of plaintext keys to keychain"
```

---

### Task 4: Swap key accessors in claude.ts and elevenlabs.ts

**Files:**
- Modify: `fluent-mineiro/src/lib/claude.ts:4` (comment), `:8` (imports), `:41-51` (accessors)
- Modify: `fluent-mineiro/src/lib/elevenlabs.ts:8` (imports), `:58-68` (accessors)
- Test: `fluent-mineiro/test/key-accessors.test.ts`

**Interfaces:**
- Consumes: `getSecret`, `setSecret`, `deleteSecret` (`secrets.ts`).
- Produces (unchanged signatures + new clear helpers):
  - `claude.ts`: `getApiKey(): Promise<string | null>`, `setApiKey(key: string): Promise<void>`, `clearApiKey(): Promise<void>`
  - `elevenlabs.ts`: `getElevenLabsKey(): Promise<string | null>`, `setElevenLabsKey(key: string): Promise<void>`, `clearElevenLabsKey(): Promise<void>`

- [ ] **Step 1: Write the failing delegation test**

Create `fluent-mineiro/test/key-accessors.test.ts`. It mocks the secret + heavy Tauri imports so the modules load in node:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- test/key-accessors.test.ts`
Expected: FAIL — `getApiKey`/`clearApiKey` still read from `getProfile`, and `clearApiKey`/`clearElevenLabsKey` don't exist yet.

- [ ] **Step 3: Update `claude.ts`**

In `fluent-mineiro/src/lib/claude.ts`:

Change the header comment line 4 from:
```ts
 * API key stored in local SQLite profile table.
```
to:
```ts
 * API key stored in the OS keychain (see secrets.ts).
```

The import on line 8 currently is `import { getProfile, setProfile } from './db';`. `getProfile`/`setProfile` are still used elsewhere in this file (coaching-note cache), so keep that line and add a new import below it:
```ts
import { getSecret, setSecret, deleteSecret } from './secrets';
```

Replace the accessors (lines 41-51):
```ts
export async function getApiKey(): Promise<string | null> {
  try {
    return await getSecret('anthropic_api_key');
  } catch {
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  await setSecret('anthropic_api_key', key);
}

export async function clearApiKey(): Promise<void> {
  await deleteSecret('anthropic_api_key');
}
```

- [ ] **Step 4: Update `elevenlabs.ts`**

In `fluent-mineiro/src/lib/elevenlabs.ts`, the line 8 import `import { getProfile, setProfile } from './db';` stays (used by TTS usage/voice helpers). Add below it:
```ts
import { getSecret, setSecret, deleteSecret } from './secrets';
```

Replace the accessors (lines 58-68):
```ts
export async function getElevenLabsKey(): Promise<string | null> {
  try {
    return await getSecret('elevenlabs_api_key');
  } catch {
    return null;
  }
}

export async function setElevenLabsKey(key: string): Promise<void> {
  await setSecret('elevenlabs_api_key', key);
}

export async function clearElevenLabsKey(): Promise<void> {
  await deleteSecret('elevenlabs_api_key');
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test -- test/key-accessors.test.ts`
Expected: PASS — 6 passed.

- [ ] **Step 6: Type-check the whole frontend**

Run: `npm run check`
Expected: 0 errors (confirms no dangling `getProfile('api_key')` references or type mismatches).

- [ ] **Step 7: Commit**

```bash
git add src/lib/claude.ts src/lib/elevenlabs.ts test/key-accessors.test.ts
git commit -m "feat(secrets): read/write API keys via the OS keychain in claude + elevenlabs"
```

---

### Task 5: Wire startup migration and Settings clear buttons

**Files:**
- Modify: `fluent-mineiro/src/routes/+layout.svelte:4` (import) and `:11-22` (call migration in `onMount`)
- Modify: `fluent-mineiro/src/routes/settings/+page.svelte:4` (imports), `:110-115` (`removeKey`), `:152-159` (`removeElevenKey`)

**Interfaces:**
- Consumes: `migrateSecrets` (`secrets-migration.ts`); `clearApiKey` (`claude.ts`); `clearElevenLabsKey` (`elevenlabs.ts`).
- Produces: startup migration runs once; Settings "remove key" buttons delete from the keychain instead of blanking a plaintext row.

- [ ] **Step 1: Call the migration on app startup**

In `fluent-mineiro/src/routes/+layout.svelte`, add an import after line 4 (`import { onMount } from 'svelte';`):
```ts
  import { migrateSecrets } from '$lib/secrets-migration';
```

Inside the existing `onMount(() => { ... })` (starts line 11), add as the first statements in the callback (before the theme code), a fire-and-forget call that never blocks or crashes app load:
```ts
    // One-time move of any plaintext API keys into the OS keychain.
    migrateSecrets().catch((e) => console.error('secret migration failed', e));
```

- [ ] **Step 2: Point the Settings "remove key" buttons at the keychain**

In `fluent-mineiro/src/routes/settings/+page.svelte`:

The imports at the top (around line 4) currently include `import { getApiKey, setApiKey } from '$lib/claude';`. Change it to:
```ts
  import { getApiKey, setApiKey, clearApiKey } from '$lib/claude';
```
Ensure the ElevenLabs import includes the clear helper (find the existing `from '$lib/elevenlabs'` import and add `clearElevenLabsKey`):
```ts
  import { getElevenLabsKey, setElevenLabsKey, clearElevenLabsKey, getVoices, getSelectedVoice, setSelectedVoice } from '$lib/elevenlabs';
```
(Keep whatever other names that import already lists; just add `clearElevenLabsKey`. `setElevenLabsKey`/`getElevenLabsKey` may already be imported.)

Replace `removeKey` (lines 110-115):
```ts
  async function removeKey() {
    try {
      await clearApiKey();
      hasApiKey = false;
    } catch {}
  }
```

Replace `removeElevenKey` (lines 152-159):
```ts
  async function removeElevenKey() {
    try {
      await clearElevenLabsKey();
      hasElevenKey = false;
      voices = [];
      selectedVoiceId = '';
    } catch {}
  }
```

If `setProfile` is no longer referenced anywhere else in this file after these edits, remove it from the `$lib/db` import to keep `npm run check` clean; if `resetProgress` still uses `setProfile`, leave the import as-is.

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+layout.svelte src/routes/settings/+page.svelte
git commit -m "feat(secrets): run key migration on startup; Settings clears keys from keychain"
```

---

### Task 6: Full verification, docs, and TODO cleanup

**Files:**
- Modify: `CLAUDE.md` (SQLite `profile` row description)
- Modify: `TODOS.md` (remove the completed entry)

- [ ] **Step 1: Run the full frontend suite and type-check**

Run: `npm run test`
Expected: PASS — all test files green (secrets, secrets-migration, key-accessors).

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Run the Rust suite and build**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

Run: `cargo build --manifest-path src-tauri/Cargo.toml`
Expected: builds cleanly.

- [ ] **Step 3: Manual QA (run the app)**

Launch: `npm run tauri dev` (from `fluent-mineiro/`). Walk the spec's checklist:
  1. **Upgrade path:** with an existing key set (pre-migration `user.db`), launch once. Then open Settings → the key still works (send a conversation message / load voices). Confirm the plaintext is gone: `sqlite3 ~/.local/share/com.christopherlandaverde.sabia/user.db "SELECT key FROM profile WHERE key IN ('api_key','elevenlabs_key');"` returns no rows, and `SELECT value FROM profile WHERE key='secrets_migrated';` returns `1`.
  2. **Fresh entry:** clear a key in Settings, re-enter it, confirm it saves and works (now stored only in the keychain: `secret-tool` not required — verify via the app).
  3. **Remove key:** use the Settings "remove" button; confirm the app reports no key and the feature gates off.

Record results in the PR description. (This step has no automated gate — the keychain requires the running Tauri app.)

- [ ] **Step 4: Update docs**

In `CLAUDE.md`, the SQLite tables section describes the `profile` row as:
```
| `profile` | Key-value store (streak, XP, level, daily goal, API key, settings) |
```
Change it to:
```
| `profile` | Key-value store (streak, XP, level, daily goal, settings). API keys live in the OS keychain (see `src/lib/secrets.ts`). |
```

In `TODOS.md`, delete the entire "## Migrate API Key to OS Keychain" section (and its trailing `---` separator if it leaves a dangling one).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md TODOS.md
git commit -m "docs: API keys now live in the OS keychain; close keychain TODO"
```

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin feat/api-keys-keychain
gh pr create --title "feat: migrate API keys to the OS keychain" --body "Moves the Claude and ElevenLabs API keys out of plaintext SQLite into the OS keychain via the keyring crate. One-time failure-safe migration on startup, no plaintext fallback. See docs/superpowers/specs/2026-07-01-api-keys-os-keychain-design.md. Manual QA results: <paste from Step 3>."
```

---

## Self-Review

**Spec coverage:**
- Store = OS keychain via `keyring` crate → Task 1. ✓
- Both keys (`anthropic_api_key`, `elevenlabs_api_key`) → Tasks 3, 4. ✓
- Custom Tauri commands (not a plugin) → Task 1. ✓
- Frontend seam `secrets.ts` mirroring getProfile/setProfile → Task 2. ✓
- `claude.ts`/`elevenlabs.ts` swap + clear helpers → Task 4. ✓
- Settings "clear key" → `deleteSecret` → Task 5. ✓
- One-time migration, guarded, hard-delete, failure-safe → Task 3 (logic) + Task 5 (wiring). ✓
- No plaintext fallback → enforced in Task 3 logic + Task 4 try/catch returns null (never writes). ✓
- Linux cargo features / no system deps → Task 1 Steps 1, 6 + Global Constraints. ✓
- Tests: Rust mock roundtrip + TS migration cases (a-e) + delegation → Tasks 1, 3, 4. ✓
- Manual QA checklist → Task 6 Step 3. ✓
- Non-secret profile values untouched → no task modifies them; `deleteProfile` only called with `api_key`/`elevenlabs_key`. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/vague steps — every code step shows full code. ✓

**Type consistency:** `getSecret/setSecret/deleteSecret`, `deleteProfile`, `migrateSecrets`, `clearApiKey`, `clearElevenLabsKey`, secret names `anthropic_api_key`/`elevenlabs_api_key`, and service `com.christopherlandaverde.sabia` are used identically across Tasks 1-6. ✓
