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
    use keyring::credential::{
        Credential, CredentialApi, CredentialBuilderApi, CredentialPersistence,
    };
    use std::any::Any;
    use std::collections::HashMap;
    use std::sync::{Mutex, Once, OnceLock};

    // NOTE: keyring 3.x's built-in `keyring::mock` module is documented to
    // provide "no persistence other than in the entry itself" — every
    // `Entry::new(..)` call gets its own brand-new, empty `MockCredential`
    // with no lookup by (service, user) at all (confirmed in keyring-rs
    // src/mock.rs: `MockCredentialBuilder::build` always returns
    // `MockCredential::default()`). Our commands correctly construct a
    // fresh `Entry` per invocation (that's required for real backends,
    // which persist externally, keyed by service+user), but that means
    // the stock mock can never round-trip a set-then-get across two
    // separate command calls. So we install a tiny custom
    // `CredentialBuilder` here: an in-memory store keyed by (service, user),
    // scoped to this process only. It never touches any real OS keychain,
    // and it lets these tests exercise `secret_get`/`secret_set`/
    // `secret_delete` the way they're actually invoked (independently,
    // per Tauri call).
    #[derive(Debug)]
    struct ProcessMockCredential {
        key: (String, String),
    }

    // Keyed by (service, user) -> stored secret bytes.
    type MockStore = Mutex<HashMap<(String, String), Vec<u8>>>;

    fn store() -> &'static MockStore {
        static STORE: OnceLock<MockStore> = OnceLock::new();
        STORE.get_or_init(|| Mutex::new(HashMap::new()))
    }

    impl CredentialApi for ProcessMockCredential {
        fn set_secret(&self, secret: &[u8]) -> keyring::Result<()> {
            store()
                .lock()
                .unwrap()
                .insert(self.key.clone(), secret.to_vec());
            Ok(())
        }

        fn get_secret(&self) -> keyring::Result<Vec<u8>> {
            store()
                .lock()
                .unwrap()
                .get(&self.key)
                .cloned()
                .ok_or(keyring::Error::NoEntry)
        }

        fn delete_credential(&self) -> keyring::Result<()> {
            store()
                .lock()
                .unwrap()
                .remove(&self.key)
                .map(|_| ())
                .ok_or(keyring::Error::NoEntry)
        }

        fn as_any(&self) -> &dyn Any {
            self
        }
    }

    #[derive(Debug, Default)]
    struct ProcessMockBuilder;

    impl CredentialBuilderApi for ProcessMockBuilder {
        fn build(
            &self,
            _target: Option<&str>,
            service: &str,
            user: &str,
        ) -> keyring::Result<Box<Credential>> {
            Ok(Box::new(ProcessMockCredential {
                key: (service.to_string(), user.to_string()),
            }))
        }

        fn as_any(&self) -> &dyn Any {
            self
        }

        fn persistence(&self) -> CredentialPersistence {
            CredentialPersistence::ProcessOnly
        }
    }

    static INIT: Once = Once::new();

    // Install the in-memory mock backend once, before any Entry is created.
    // Each test uses a unique key so the shared mock store can't cross-talk.
    fn init_mock() {
        INIT.call_once(|| {
            keyring::set_default_credential_builder(Box::new(ProcessMockBuilder));
        });
    }

    #[test]
    fn set_then_get_roundtrips() {
        init_mock();
        secret_set("t1_anthropic_api_key".into(), "sk-abc".into()).unwrap();
        assert_eq!(
            secret_get("t1_anthropic_api_key".into()).unwrap(),
            Some("sk-abc".to_string())
        );
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
