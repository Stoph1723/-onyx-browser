use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::sync::Mutex;
use tracing::{info, warn, error};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite, Row};
use uuid::Uuid;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use chrono::{DateTime, Utc};
use thiserror::Error;

// Re-export types for external use
pub use self::types::{PasswordEntry, CreditCardEntry, IdentityEntry, SecureNoteEntry, PasswordStrength, Strength, VaultData, VaultConfig};

mod types {
    use super::*;
    // Re-export all the public types
    pub use super::{PasswordEntry, CreditCardEntry, IdentityEntry, SecureNoteEntry, PasswordStrength, Strength, VaultData, VaultConfig};
}

#[derive(Debug, Error)]
pub enum PasswordManagerError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Encryption error: {0}")]
    Encryption(String),
    #[error("Decryption error: {0}")]
    Decryption(String),
    #[error("Authentication failed")]
    AuthFailed,
    #[error("Vault locked")]
    VaultLocked,
    #[error("Vault not initialized")]
    VaultNotInitialized,
    #[error("Invalid master password")]
    InvalidMasterPassword,
    #[error("Item not found: {0}")]
    NotFound(String),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Base64 decode error: {0}")]
    Base64(#[from] base64::DecodeError),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultConfig {
    pub version: u32,
    pub kdf_iterations: u32,
    pub kdf_memory: u32,
    pub kdf_parallelism: u32,
    pub salt: String,
    pub verification_hash: String,
    pub created_at: DateTime<Utc>,
    pub last_unlocked: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordEntry {
    pub id: String,
    pub title: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub category: String,
    pub favorite: bool,
    pub totp_secret: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreditCardEntry {
    pub id: String,
    pub name: String,
    pub cardholder_name: String,
    pub number: String,
    pub expiry_month: u8,
    pub expiry_year: u16,
    pub cvv: String,
    pub card_type: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentityEntry {
    pub id: String,
    pub name: String,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub postal_code: Option<String>,
    pub country: Option<String>,
    pub company: Option<String>,
    pub job_title: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecureNoteEntry {
    pub id: String,
    pub title: String,
    pub content: String,
    pub category: String,
    pub favorite: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultData {
    pub passwords: HashMap<String, PasswordEntry>,
    pub credit_cards: HashMap<String, CreditCardEntry>,
    pub identities: HashMap<String, IdentityEntry>,
    pub secure_notes: HashMap<String, SecureNoteEntry>,
}

impl Default for VaultData {
    fn default() -> Self {
        Self {
            passwords: HashMap::new(),
            credit_cards: HashMap::new(),
            identities: HashMap::new(),
            secure_notes: HashMap::new(),
        }
    }
}

pub struct PasswordManager {
    pool: Pool<Sqlite>,
    vault_path: PathBuf,
    master_key: Mutex<Option<[u8; 32]>>,
    vault_data: Mutex<VaultData>,
    config: Mutex<Option<VaultConfig>>,
    auto_lock_timer: Mutex<Option<tokio::task::JoinHandle<()>>>,
    auto_lock_timeout: Mutex<Option<std::time::Duration>>,
}

impl PasswordManager {
    pub async fn new(data_dir: PathBuf) -> Result<Self, PasswordManagerError> {
        let vault_path = data_dir.join("vault.db");
        let db_exists = vault_path.exists();

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&format!("sqlite://{}?mode=rwc", vault_path.display()))
            .await?;

        if !db_exists {
            Self::init_database(&pool).await?;
        }

        let manager = Self {
            pool,
            vault_path,
            master_key: Mutex::new(None),
            vault_data: Mutex::new(VaultData::default()),
            config: Mutex::new(None),
            auto_lock_timer: Mutex::new(None),
            auto_lock_timeout: Mutex::new(None),
        };

        Ok(manager)
    }

    async fn init_database(pool: &Pool<Sqlite>) -> Result<(), PasswordManagerError> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS vault_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                version INTEGER NOT NULL,
                kdf_iterations INTEGER NOT NULL,
                kdf_memory INTEGER NOT NULL,
                kdf_parallelism INTEGER NOT NULL,
                salt TEXT NOT NULL,
                verification_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_unlocked TEXT
            );

            CREATE TABLE IF NOT EXISTS passwords (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                username TEXT,
                email TEXT,
                password TEXT NOT NULL,
                url TEXT,
                notes TEXT,
                category TEXT NOT NULL DEFAULT 'General',
                favorite INTEGER NOT NULL DEFAULT 0,
                totp_secret TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_used TEXT
            );

            CREATE TABLE IF NOT EXISTS credit_cards (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                cardholder_name TEXT NOT NULL,
                number TEXT NOT NULL,
                expiry_month INTEGER NOT NULL,
                expiry_year INTEGER NOT NULL,
                cvv TEXT NOT NULL,
                card_type TEXT NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS identities (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                first_name TEXT,
                middle_name TEXT,
                last_name TEXT,
                email TEXT,
                phone TEXT,
                address_line1 TEXT,
                address_line2 TEXT,
                city TEXT,
                state TEXT,
                postal_code TEXT,
                country TEXT,
                company TEXT,
                job_title TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS secure_notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'General',
                favorite INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_passwords_url ON passwords(url);
            CREATE INDEX IF NOT EXISTS idx_passwords_category ON passwords(category);
            CREATE INDEX IF NOT EXISTS idx_passwords_favorite ON passwords(favorite);
        "#,
        )
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn initialize_vault(&self, master_password: &str) -> Result<(), PasswordManagerError> {
        let mut config_guard = self.config.lock().await;
        if config_guard.is_some() {
            return Err(PasswordManagerError::Encryption("Vault already initialized".into()));
        }

        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::new(
            argon2::Algorithm::Argon2id,
            argon2::Version::V0x13,
            argon2::Params::new(65536, 3, 1, None).map_err(|e| PasswordManagerError::Encryption(e.to_string()))?,
        );

        let password_hash = argon2
            .hash_password(master_password.as_bytes(), &salt)
            .map_err(|e| PasswordManagerError::Encryption(e.to_string()))?;

        let master_key = self.derive_key(master_password, salt.as_str())?;

        let verification_hash = self.hash_verification(&master_key)?;

        let config = VaultConfig {
            version: 1,
            kdf_iterations: 3,
            kdf_memory: 65536,
            kdf_parallelism: 1,
            salt: salt.to_string(),
            verification_hash,
            created_at: Utc::now(),
            last_unlocked: None,
        };

        sqlx::query(
            "INSERT INTO vault_config (id, version, kdf_iterations, kdf_memory, kdf_parallelism, salt, verification_hash, created_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(config.version as i64)
        .bind(config.kdf_iterations as i64)
        .bind(config.kdf_memory as i64)
        .bind(config.kdf_parallelism as i64)
        .bind(&config.salt)
        .bind(&config.verification_hash)
        .bind(config.created_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        *self.master_key.lock().await = Some(master_key);
        *config_guard = Some(config);

        let empty_vault = VaultData::default();
        self.encrypt_and_save_vault(&empty_vault).await?;

        info!("Vault initialized successfully");
        Ok(())
    }

    pub async fn unlock_vault(&self, master_password: &str) -> Result<(), PasswordManagerError> {
        let config_guard = self.config.lock().await;
        let config = config_guard.as_ref().ok_or(PasswordManagerError::VaultNotInitialized)?;

        let master_key = self.derive_key(master_password, &config.salt)?;
        let verification_hash = self.hash_verification(&master_key)?;

        if verification_hash != config.verification_hash {
            return Err(PasswordManagerError::InvalidMasterPassword);
        }

        let vault_data = self.decrypt_and_load_vault(&master_key).await?;

        *self.master_key.lock().await = Some(master_key);
        *self.vault_data.lock().await = vault_data;

        sqlx::query("UPDATE vault_config SET last_unlocked = ? WHERE id = 1")
            .bind(Utc::now().to_rfc3339())
            .execute(&self.pool)
            .await?;

        if let Some(config) = config_guard.as_mut() {
            config.last_unlocked = Some(Utc::now());
        }

        self.start_auto_lock_timer().await;

        info!("Vault unlocked successfully");
        Ok(())
    }

    pub async fn lock_vault(&self) -> Result<(), PasswordManagerError> {
        *self.master_key.lock().await = None;
        *self.vault_data.lock().await = VaultData::default();

        if let Some(handle) = self.auto_lock_timer.lock().await.take() {
            handle.abort();
        }

        info!("Vault locked");
        Ok(())
    }

    pub async fn is_unlocked(&self) -> bool {
        self.master_key.lock().await.is_some()
    }

    pub async fn is_initialized(&self) -> bool {
        let config_guard = self.config.lock().await;
        config_guard.is_some() || sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM vault_config WHERE id = 1")
            .fetch_one(&self.pool)
            .await
            .unwrap_or(0) > 0
    }

    pub async fn load_existing_config(&self) -> Result<(), PasswordManagerError> {
        let row = sqlx::query("SELECT * FROM vault_config WHERE id = 1")
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let config = VaultConfig {
                version: row.get("version"),
                kdf_iterations: row.get("kdf_iterations"),
                kdf_memory: row.get("kdf_memory"),
                kdf_parallelism: row.get("kdf_parallelism"),
                salt: row.get("salt"),
                verification_hash: row.get("verification_hash"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?.with_timezone(&Utc),
                last_unlocked: row.get::<Option<String>, _>("last_unlocked")
                    .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
            };
            *self.config.lock().await = Some(config);
        }

        Ok(())
    }

    fn derive_key(&self, password: &str, salt: &str) -> Result<[u8; 32], PasswordManagerError> {
        let argon2 = Argon2::new(
            argon2::Algorithm::Argon2id,
            argon2::Version::V0x13,
            argon2::Params::new(65536, 3, 1, None).map_err(|e| PasswordManagerError::Encryption(e.to_string()))?,
        );

        let mut key = [0u8; 32];
        argon2
            .hash_password_into(password.as_bytes(), salt.as_bytes(), &mut key)
            .map_err(|e| PasswordManagerError::Encryption(e.to_string()))?;

        Ok(key)
    }

    fn hash_verification(&self, key: &[u8; 32]) -> Result<String, PasswordManagerError> {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(b"privacy-browser-vault-verification");
        hasher.update(key);
        let result = hasher.finalize();
        Ok(BASE64.encode(result))
    }

    async fn encrypt_and_save_vault(&self, vault: &VaultData) -> Result<(), PasswordManagerError> {
        let key = self.master_key.lock().await.ok_or(PasswordManagerError::VaultLocked)?;
        let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| PasswordManagerError::Encryption(e.to_string()))?;

        let json = serde_json::to_vec(vault)?;
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = cipher.encrypt(&nonce, json.as_ref()).map_err(|e| PasswordManagerError::Encryption(e.to_string()))?;

        let mut combined = Vec::new();
        combined.extend_from_slice(nonce.as_slice());
        combined.extend_from_slice(&ciphertext);

        let encoded = BASE64.encode(combined);

        sqlx::query("INSERT OR REPLACE INTO vault_data (id, data) VALUES (1, ?)")
            .bind(encoded)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn decrypt_and_load_vault(&self, key: &[u8; 32]) -> Result<VaultData, PasswordManagerError> {
        let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| PasswordManagerError::Decryption(e.to_string()))?;

        let encoded: Option<String> = sqlx::query_scalar("SELECT data FROM vault_data WHERE id = 1")
            .fetch_optional(&self.pool)
            .await?;

        let encoded = encoded.ok_or(PasswordManagerError::Decryption("No vault data found".into()))?;
        let combined = BASE64.decode(encoded)?;

        if combined.len() < 12 {
            return Err(PasswordManagerError::Decryption("Invalid vault data".into()));
        }

        let (nonce_bytes, ciphertext) = combined.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        let plaintext = cipher.decrypt(nonce, ciphertext).map_err(|e| PasswordManagerError::Decryption(e.to_string()))?;

        let vault: VaultData = serde_json::from_slice(&plaintext)?;
        Ok(vault)
    }

    async fn start_auto_lock_timer(&self) {
        if let Some(timeout) = *self.auto_lock_timeout.lock().await {
            let manager = self.clone_for_timer();
            let handle = tokio::spawn(async move {
                tokio::time::sleep(timeout).await;
                let _ = manager.lock_vault().await;
            });
            *self.auto_lock_timer.lock().await = Some(handle);
        }
    }

    fn clone_for_timer(&self) -> Self {
        Self {
            pool: self.pool.clone(),
            vault_path: self.vault_path.clone(),
            master_key: Mutex::new(None),
            vault_data: Mutex::new(VaultData::default()),
            config: Mutex::new(None),
            auto_lock_timer: Mutex::new(None),
            auto_lock_timeout: Mutex::new(None),
        }
    }

    pub async fn set_auto_lock_timeout(&self, timeout: Option<std::time::Duration>) {
        *self.auto_lock_timeout.lock().await = timeout;
        self.start_auto_lock_timer().await;
    }

    // Password CRUD
    pub async fn add_password(&self, mut entry: PasswordEntry) -> Result<String, PasswordManagerError> {
        if entry.id.is_empty() {
            entry.id = Uuid::new_v4().to_string();
        }
        entry.created_at = Utc::now();
        entry.updated_at = Utc::now();

        self.vault_data.lock().await.passwords.insert(entry.id.clone(), entry.clone());
        self.save_vault().await?;
        Ok(entry.id)
    }

    pub async fn get_password(&self, id: &str) -> Result<Option<PasswordEntry>, PasswordManagerError> {
        Ok(self.vault_data.lock().await.passwords.get(id).cloned())
    }

    pub async fn update_password(&self, mut entry: PasswordEntry) -> Result<(), PasswordManagerError> {
        entry.updated_at = Utc::now();
        self.vault_data.lock().await.passwords.insert(entry.id.clone(), entry);
        self.save_vault().await
    }

    pub async fn delete_password(&self, id: &str) -> Result<(), PasswordManagerError> {
        self.vault_data.lock().await.passwords.remove(id);
        self.save_vault().await
    }

    pub async fn list_passwords(&self) -> Result<Vec<PasswordEntry>, PasswordManagerError> {
        Ok(self.vault_data.lock().await.passwords.values().cloned().collect())
    }

    pub async fn search_passwords(&self, query: &str) -> Result<Vec<PasswordEntry>, PasswordManagerError> {
        let q = query.to_lowercase();
        let results: Vec<_> = self.vault_data.lock().await
            .passwords
            .values()
            .filter(|p| {
                p.title.to_lowercase().contains(&q)
                    || p.username.as_ref().map_or(false, |u| u.to_lowercase().contains(&q))
                    || p.email.as_ref().map_or(false, |e| e.to_lowercase().contains(&q))
                    || p.url.as_ref().map_or(false, |u| u.to_lowercase().contains(&q))
                    || p.notes.as_ref().map_or(false, |n| n.to_lowercase().contains(&q))
            })
            .cloned()
            .collect();
        Ok(results)
    }

    // Credit Card CRUD
    pub async fn add_credit_card(&self, mut entry: CreditCardEntry) -> Result<String, PasswordManagerError> {
        if entry.id.is_empty() {
            entry.id = Uuid::new_v4().to_string();
        }
        entry.created_at = Utc::now();
        entry.updated_at = Utc::now();

        self.vault_data.lock().await.credit_cards.insert(entry.id.clone(), entry.clone());
        self.save_vault().await?;
        Ok(entry.id)
    }

    pub async fn get_credit_card(&self, id: &str) -> Result<Option<CreditCardEntry>, PasswordManagerError> {
        Ok(self.vault_data.lock().await.credit_cards.get(id).cloned())
    }

    pub async fn update_credit_card(&self, mut entry: CreditCardEntry) -> Result<(), PasswordManagerError> {
        entry.updated_at = Utc::now();
        self.vault_data.lock().await.credit_cards.insert(entry.id.clone(), entry);
        self.save_vault().await
    }

    pub async fn delete_credit_card(&self, id: &str) -> Result<(), PasswordManagerError> {
        self.vault_data.lock().await.credit_cards.remove(id);
        self.save_vault().await
    }

    pub async fn list_credit_cards(&self) -> Result<Vec<CreditCardEntry>, PasswordManagerError> {
        Ok(self.vault_data.lock().await.credit_cards.values().cloned().collect())
    }

    // Identity CRUD
    pub async fn add_identity(&self, mut entry: IdentityEntry) -> Result<String, PasswordManagerError> {
        if entry.id.is_empty() {
            entry.id = Uuid::new_v4().to_string();
        }
        entry.created_at = Utc::now();
        entry.updated_at = Utc::now();

        self.vault_data.lock().await.identities.insert(entry.id.clone(), entry.clone());
        self.save_vault().await?;
        Ok(entry.id)
    }

    pub async fn get_identity(&self, id: &str) -> Result<Option<IdentityEntry>, PasswordManagerError> {
        Ok(self.vault_data.lock().await.identities.get(id).cloned())
    }

    pub async fn update_identity(&self, mut entry: IdentityEntry) -> Result<(), PasswordManagerError> {
        entry.updated_at = Utc::now();
        self.vault_data.lock().await.identities.insert(entry.id.clone(), entry);
        self.save_vault().await
    }

    pub async fn delete_identity(&self, id: &str) -> Result<(), PasswordManagerError> {
        self.vault_data.lock().await.identities.remove(id);
        self.save_vault().await
    }

    pub async fn list_identities(&self) -> Result<Vec<IdentityEntry>, PasswordManagerError> {
        Ok(self.vault_data.lock().await.identities.values().cloned().collect())
    }

    // Secure Note CRUD
    pub async fn add_secure_note(&self, mut entry: SecureNoteEntry) -> Result<String, PasswordManagerError> {
        if entry.id.is_empty() {
            entry.id = Uuid::new_v4().to_string();
        }
        entry.created_at = Utc::now();
        entry.updated_at = Utc::now();

        self.vault_data.lock().await.secure_notes.insert(entry.id.clone(), entry.clone());
        self.save_vault().await?;
        Ok(entry.id)
    }

    pub async fn get_secure_note(&self, id: &str) -> Result<Option<SecureNoteEntry>, PasswordManagerError> {
        Ok(self.vault_data.lock().await.secure_notes.get(id).cloned())
    }

    pub async fn update_secure_note(&self, mut entry: SecureNoteEntry) -> Result<(), PasswordManagerError> {
        entry.updated_at = Utc::now();
        self.vault_data.lock().await.secure_notes.insert(entry.id.clone(), entry);
        self.save_vault().await
    }

    pub async fn delete_secure_note(&self, id: &str) -> Result<(), PasswordManagerError> {
        self.vault_data.lock().await.secure_notes.remove(id);
        self.save_vault().await
    }

    pub async fn list_secure_notes(&self) -> Result<Vec<SecureNoteEntry>, PasswordManagerError> {
        Ok(self.vault_data.lock().await.secure_notes.values().cloned().collect())
    }

    // Utility
    async fn save_vault(&self) -> Result<(), PasswordManagerError> {
        let vault = self.vault_data.lock().await.clone();
        self.encrypt_and_save_vault(&vault).await
    }

    pub async fn change_master_password(&self, current: &str, new: &str) -> Result<(), PasswordManagerError> {
        if !self.is_unlocked().await {
            return Err(PasswordManagerError::VaultLocked);
        }

        let config = self.config.lock().await.clone().ok_or(PasswordManagerError::VaultNotInitialized)?;

        let current_key = self.derive_key(current, &config.salt)?;
        let current_verification = self.hash_verification(&current_key)?;

        if current_verification != config.verification_hash {
            return Err(PasswordManagerError::InvalidMasterPassword);
        }

        let new_salt = SaltString::generate(&mut OsRng);
        let new_key = self.derive_key(new, new_salt.as_str())?;
        let new_verification = self.hash_verification(&new_key)?;

        let vault = self.vault_data.lock().await.clone();
        *self.master_key.lock().await = Some(new_key);

        let new_config = VaultConfig {
            salt: new_salt.to_string(),
            verification_hash: new_verification,
            last_unlocked: Some(Utc::now()),
            ..config
        };

        sqlx::query("UPDATE vault_config SET salt = ?, verification_hash = ?, last_unlocked = ? WHERE id = 1")
            .bind(&new_config.salt)
            .bind(&new_config.verification_hash)
            .bind(new_config.last_unlocked.unwrap().to_rfc3339())
            .execute(&self.pool)
            .await?;

        *self.config.lock().await = Some(new_config);
        self.encrypt_and_save_vault(&vault).await?;

        Ok(())
    }

    pub async fn export_vault(&self) -> Result<String, PasswordManagerError> {
        if !self.is_unlocked().await {
            return Err(PasswordManagerError::VaultLocked);
        }
        let vault = self.vault_data.lock().await.clone();
        Ok(serde_json::to_string_pretty(&vault)?)
    }

    pub async fn import_vault(&self, json: &str) -> Result<(), PasswordManagerError> {
        if !self.is_unlocked().await {
            return Err(PasswordManagerError::VaultLocked);
        }
        let vault: VaultData = serde_json::from_str(json)?;
        *self.vault_data.lock().await = vault;
        self.save_vault().await
    }

    pub async fn generate_password(&self, length: usize, uppercase: bool, lowercase: bool, numbers: bool, symbols: bool) -> String {
        let mut charset = String::new();
        if uppercase { charset.push_str("ABCDEFGHIJKLMNOPQRSTUVWXYZ"); }
        if lowercase { charset.push_str("abcdefghijklmnopqrstuvwxyz"); }
        if numbers { charset.push_str("0123456789"); }
        if symbols { charset.push_str("!@#$%^&*()_+-=[]{}|;:,.<>?"); }

        if charset.is_empty() {
            charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".to_string();
        }

        let charset_bytes = charset.as_bytes();
        let mut password = String::with_capacity(length);
        let mut rng = OsRng;

        for _ in 0..length {
            let idx = rng.next_u32() as usize % charset_bytes.len();
            password.push(charset_bytes[idx] as char);
        }

        password
    }

    pub async fn check_password_strength(&self, password: &str) -> PasswordStrength {
        let mut score = 0;
        let mut feedback = Vec::new();

        if password.len() >= 8 { score += 1; } else { feedback.push("At least 8 characters"); }
        if password.len() >= 12 { score += 1; }
        if password.len() >= 16 { score += 1; }
        if password.chars().any(|c| c.is_lowercase()) { score += 1; } else { feedback.push("Add lowercase letters"); }
        if password.chars().any(|c| c.is_uppercase()) { score += 1; } else { feedback.push("Add uppercase letters"); }
        if password.chars().any(|c| c.is_ascii_digit()) { score += 1; } else { feedback.push("Add numbers"); }
        if password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c)) { score += 1; } else { feedback.push("Add symbols"); }

        // Check for common patterns
        if password.to_lowercase().contains("password") { score = score.saturating_sub(2); feedback.push("Avoid 'password'"); }
        if password.chars().any(|c| c.is_ascii_digit()) && password.chars().filter(|c| c.is_ascii_digit()).count() == password.len() { score = score.saturating_sub(1); feedback.push("Don't use only numbers"); }

        let strength = match score {
            0..=2 => Strength::VeryWeak,
            3..=4 => Strength::Weak,
            5..=6 => Strength::Fair,
            7..=8 => Strength::Good,
            _ => Strength::Strong,
        };

        PasswordStrength { score, strength, feedback }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordStrength {
    pub score: u8,
    pub strength: Strength,
    pub feedback: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum Strength {
    VeryWeak,
    Weak,
    Fair,
    Good,
    Strong,
}

impl Clone for PasswordManager {
    fn clone(&self) -> Self {
        Self {
            pool: self.pool.clone(),
            vault_path: self.vault_path.clone(),
            master_key: Mutex::new(None),
            vault_data: Mutex::new(VaultData::default()),
            config: Mutex::new(None),
            auto_lock_timer: Mutex::new(None),
            auto_lock_timeout: Mutex::new(None),
        }
    }
}