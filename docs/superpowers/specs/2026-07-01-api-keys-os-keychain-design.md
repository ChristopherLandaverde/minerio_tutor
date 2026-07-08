# Design: Migrate API keys to the OS keychain

**Date:** 2026-07-01
**Status:** Approved (brainstorming) — ready for implementation plan
**Component:** Sabiá (fluent-mineiro) secret storage

## Problem

The app stores two API keys as **plaintext** in the SQLite `profile` table:

| `profile` key | Secret | Consumer |
|---|---|---|
| `api_key` | Anthropic / Claude key | `src/lib/claude.ts` (sent as `x-api-key`) |
| `elevenlabs_key` | ElevenLabs key | `src/lib/elevenlabs.ts` (TTS/STT) |

Any process running as the same user can read `user.db` and lift these keys. This
is a security anti-pattern even for a single-user app.

## Threat model & why this design

Getting the secrets out of a plaintext file and into an OS-encrypted store raises the
bar substantially. It does **not** fully stop a malicious *same-user* process (once the
login session is unlocked, that process can also query the Secret Service). Fully
closing that hole requires a user-entered master password on every launch, which was
rejected as too much friction for a personal app. This design targets the realistic,
high-value win: **no plaintext secrets on disk**, zero launch friction, OS-native.

## Decisions (locked)

1. **Store:** OS keychain via the Rust `keyring` crate. On this Linux box gnome-keyring /
   `org.freedesktop.secrets` is confirmed live; macOS uses Keychain, Windows uses
   Credential Manager — all handled by `keyring`.
2. **Scope:** Both keys (`api_key` and `elevenlabs_key`).
3. **Integration:** Custom Tauri commands + `keyring` crate (not a community plugin).
4. **Migration:** One-time, on app startup, **hard-deletes** the plaintext rows after a
   successful keychain write.
5. **Fallback:** None. No silent fallback to plaintext, ever.

Explicitly **out of scope:** Tauri Stronghold, master-password unlock, encrypting other
(non-secret) profile values, and anything voice/audio related.

## Architecture

Three layers, one clean seam.

### 1. Rust backend — `src-tauri/src/secrets.rs` (new)

Three Tauri commands backed by `keyring::Entry`, with
`service = "com.christopherlandaverde.sabia"` and `account = <key name>`:

- `secret_get(key: String) -> Result<Option<String>, String>`
  keychain "no entry" → `Ok(None)`; other errors → `Err(msg)`.
- `secret_set(key: String, value: String) -> Result<(), String>`
- `secret_delete(key: String) -> Result<(), String>`
  deleting a missing entry is a no-op success.

Cargo dependency (Linux backend features matter):

```toml
keyring = { version = "3", default-features = false, features = [
  "sync-secret-service", "crypto-rust", "apple-native", "windows-native"
] }
```

**Registration:** `src-tauri/src/lib.rs` currently has no `invoke_handler`. Add
`.invoke_handler(tauri::generate_handler![secrets::secret_get, secrets::secret_set,
secrets::secret_delete])` to the builder, and `mod secrets;`.

### 2. Frontend seam — `src/lib/secrets.ts` (new)

Thin wrappers over `invoke()`, mirroring the existing `getProfile/setProfile` shape so
the swap is mechanical:

- `getSecret(name: string): Promise<string | null>`
- `setSecret(name: string, value: string): Promise<void>`
- `deleteSecret(name: string): Promise<void>`

Secret names (accounts): `'anthropic_api_key'`, `'elevenlabs_api_key'`.

**Call-site changes (interfaces unchanged for their callers):**
- `claude.ts`: `getApiKey()` → `getSecret('anthropic_api_key')`; `setApiKey()` →
  `setSecret(...)`; add `clearApiKey()` → `deleteSecret(...)`.
- `elevenlabs.ts`: `getElevenLabsKey()` / `setElevenLabsKey()` → `getSecret/setSecret
  ('elevenlabs_api_key')`; add a clear helper.
- `settings/+page.svelte`: the two "clear key" handlers switch from
  `setProfile('api_key','')` (line ~112) and `setProfile('elevenlabs_key','')`
  (line ~154) to the new `deleteSecret(...)` helpers.

Non-secret `profile` values (streak, XP, `elevenlabs_voice_id`, `tts_chars_*`,
`dark_mode`, `current_level`, `daily_goal`) are untouched and stay in SQLite.

### 3. One-time migration — `migrateSecrets()`

Called once from `src/routes/+layout.svelte`'s existing `onMount` (line ~11), guarded
by a `secrets_migrated` flag in `profile`.

New helper in `db.ts`: `deleteProfile(key)` → `DELETE FROM profile WHERE key = $1`.

Algorithm (idempotent, failure-safe):

```
if getProfile('secrets_migrated') == '1': return
for (oldKey, newName) in [('api_key','anthropic_api_key'),
                          ('elevenlabs_key','elevenlabs_api_key')]:
    val = getProfile(oldKey)
    if val is non-empty:
        setSecret(newName, val)     # may throw
        deleteProfile(oldKey)       # only runs if setSecret succeeded
setProfile('secrets_migrated', '1') # only runs if the whole loop succeeded
```

If `setSecret` throws (keychain unreachable), the plaintext row is **not** deleted and
the flag is **not** set — the key is preserved and migration retries next launch.

## Failure handling

- Keychain unreachable at runtime: `secret_*` commands return `Err`. The frontend
  surfaces a clear message in Settings ("Couldn't reach your OS keychain — your key
  wasn't saved/loaded"). The app never writes the key back to plaintext.
- Empty string is treated as "no key" everywhere (matches current behavior).

## Testing

- **Rust (`secrets.rs`):** unit tests using the `keyring` crate's `mock` backend —
  set→get roundtrip, get-missing→`None`, delete, delete-missing is a no-op.
- **TS (`migrateSecrets`):** with `setSecret`/`getProfile`/`deleteProfile` mocked —
  (a) moves both keys and deletes plaintext, (b) sets the flag, (c) is idempotent on a
  second run, (d) **leaves plaintext intact and flag unset when `setSecret` throws**,
  (e) skips empty/absent keys.
- **Manual QA checklist:** fresh install (no keys); upgrade with existing plaintext keys
  (verify moved + `user.db` no longer contains them); clear-key in Settings; keychain
  locked/unavailable (verify graceful error, no plaintext written).

## Rollout

Single PR. No user-facing feature change — keys keep working; they just live in the OS
keychain afterward. `TODOS.md` entry "Migrate API Key to OS Keychain" is closed on merge.
