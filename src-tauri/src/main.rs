#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State, Wry};
use walkdir::WalkDir;
use zip::write::{FileOptions, ZipWriter};
use chrono::Utc;
use log::{error, info, warn, debug, trace};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use csv::ReaderBuilder;

use fetch::crypto::{Crypto, KeyDerivationStrength};
use fetch::error::{Error, Result};
use fetch::storage::{Storage, VaultItem, SortOrder};

use chrono::{Duration as ChronoDuration};

#[derive(Debug, Serialize, Deserialize)]
pub struct LockoutStatus {
    pub is_locked_out: bool,
    pub remaining_seconds: i64,
    pub failed_attempts: u32,
    pub max_attempts: u32,
    pub lockout_duration_minutes: u32,
}

struct PersistentRateLimiter;

impl PersistentRateLimiter {
    fn check_and_update_lockout(storage: &Storage) -> Result<LockoutStatus> {
        let config = storage.get_brute_force_config()?;

        if !config.enabled {
            // When disabled, only fetch failed_attempts for display purposes
            let failed_attempts = storage.get_failed_login_attempts().unwrap_or(0);
            return Ok(LockoutStatus {
                is_locked_out: false,
                remaining_seconds: 0,
                failed_attempts,
                max_attempts: config.max_attempts,
                lockout_duration_minutes: config.lockout_duration_minutes,
            });
        }

        let failed_attempts = storage.get_failed_login_attempts()?;
        let last_failed_timestamp = storage.get_last_failed_attempt_timestamp()?;

        if failed_attempts >= config.max_attempts {
            if let Some(last_failed) = last_failed_timestamp {
                let lockout_duration = ChronoDuration::minutes(config.lockout_duration_minutes as i64);
                let lockout_end = last_failed + lockout_duration;
                let now = Utc::now();

                if now < lockout_end {
                    let remaining = lockout_end - now;
                    return Ok(LockoutStatus {
                        is_locked_out: true,
                        remaining_seconds: remaining.num_seconds().max(0),
                        failed_attempts,
                        max_attempts: config.max_attempts,
                        lockout_duration_minutes: config.lockout_duration_minutes,
                    });
                } else {
                    storage.set_failed_login_attempts(0)?;
                    storage.set_last_failed_attempt_timestamp(None)?;
                }
            }
        }

        Ok(LockoutStatus {
            is_locked_out: false,
            remaining_seconds: 0,
            failed_attempts: storage.get_failed_login_attempts()?,
            max_attempts: config.max_attempts,
            lockout_duration_minutes: config.lockout_duration_minutes,
        })
    }

    fn record_failed_attempt(storage: &Storage) -> Result<()> {
        let current_attempts = storage.get_failed_login_attempts()?;
        let new_attempts = current_attempts + 1;

        storage.set_failed_login_attempts(new_attempts)?;
        storage.set_last_failed_attempt_timestamp(Some(Utc::now()))?;

        info!("Recorded failed login attempt. Total attempts: {}", new_attempts);
        Ok(())
    }

    fn reset_attempts(storage: &Storage) -> Result<()> {
        storage.set_failed_login_attempts(0)?;
        storage.set_last_failed_attempt_timestamp(None)?;
        info!("Reset failed login attempts after successful authentication");
        Ok(())
    }
}

pub struct VaultState {
    storage: Mutex<Storage>,
    crypto: Mutex<Crypto>,
}

#[derive(Deserialize)]
pub struct AddTextItemArgs {
    name: String,
    content: String,
    item_type: String,
    tags: Vec<String>,
    #[serde(rename = "parentId")]
    parent_id: Option<String>,
    #[serde(rename = "totpSecret")]
    totp_secret: Option<String>,
}

#[derive(Deserialize)]
pub struct AddFileItemArgs {
    name: String,
    file_path: String,
    tags: Vec<String>,
    #[serde(rename = "parentId")]
    parent_id: Option<String>,
}

#[derive(Deserialize)]
pub struct AddFolderArgs {
    name: String,
    #[serde(rename = "parentId")]
    parent_id: Option<String>,
    #[serde(rename = "folderType")]
    folder_type: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateItemArgs {
    id: String,
    name: String,
    content: String,
    item_type: String,
    tags: Vec<String>,
    #[serde(rename = "parentId")]
    parent_id: Option<String>,
    #[serde(rename = "totpSecret")]
    totp_secret: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct InitializeVaultArgs {
    #[serde(rename = "masterKey")]
    master_key: String,
    strength: Option<KeyDerivationStrength>,
}

#[derive(serde::Deserialize)]
pub struct ExportVaultArgs {
    master_key: String,
    format: String,
}

#[derive(serde::Deserialize)]
pub struct DeleteVaultArgs {
    master_key: String,
}

#[derive(serde::Deserialize)]
pub struct UpdateMasterKeyArgs {
    #[serde(rename = "currentKey")]
    current_key: String,
    #[serde(rename = "newKey")]
    new_key: String,
    strength: Option<KeyDerivationStrength>,
}

#[derive(serde::Deserialize)]
pub struct RenameTagArgs {
    #[serde(rename = "oldTagName")]
    old_tag_name: String,
    #[serde(rename = "newTagName")]
    new_tag_name: String,
}

#[derive(serde::Deserialize)]
pub struct DeleteTagArgs {
    #[serde(rename = "tagName")]
    tag_name: String,
}

#[derive(Deserialize)]
pub struct CsvImportArgs {
    #[serde(rename = "csvContent")]
    csv_content: String,
    #[serde(rename = "parentId")]
    parent_id: Option<String>,
}

#[derive(Deserialize)]
pub struct CsvRow {
    #[serde(rename = "Account")]
    account: Option<String>,
    #[serde(rename = "Login Name")]
    login_name: Option<String>,
    #[serde(rename = "Password")]
    password: Option<String>,
    #[serde(rename = "Web Site")]
    web_site: Option<String>,
    #[serde(rename = "Comments")]
    comments: Option<String>,
    // standard password manager format
    #[serde(rename = "Title")]
    title: Option<String>,
    #[serde(rename = "Username")]
    username: Option<String>,
    #[serde(rename = "URL")]
    url: Option<String>,
    #[serde(rename = "Notes")]
    notes: Option<String>,
    #[serde(rename = "Tags")]
    tags: Option<String>,
    
    // browser export format (firefox/chrome)
    #[serde(rename = "url")]
    url_browser: Option<String>,
    #[serde(rename = "username")]
    username_browser: Option<String>,
    #[serde(rename = "password")]
    password_browser: Option<String>,
    #[serde(rename = "name")]
    name_browser: Option<String>,
    #[serde(rename = "hostname")]
    hostname_browser: Option<String>,
}

#[derive(Serialize)]
pub struct VaultStatus {
    initialized: bool,
    unlocked: bool,
    strength: Option<KeyDerivationStrength>,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Trace).build())
        .setup(|app| {
            let app_data_dir = app.path()
                .app_data_dir()
                .expect("Failed to get app data directory. Please check permissions.");
            
            info!("App data directory: {}", app_data_dir.display());
            
            let vault_path = app_data_dir.join("vault");
            info!("Vault path: {}", vault_path.display());
            
            if !vault_path.exists() {
                info!("Creating vault directory: {}", vault_path.display());
                match std::fs::create_dir_all(&vault_path) {
                    Ok(_) => info!("Successfully created vault directory"),
                    Err(e) => {
                        error!("Failed to create vault directory: {}", e);
                        return Err(e.into());
                    }
                }
            } else {
                info!("Vault directory already exists");
            }

            // check if we can write to the vault directory
            let test_file = vault_path.join("test_write");
            match std::fs::write(&test_file, "test") {
                Ok(_) => {
                    std::fs::remove_file(&test_file).ok();
                    info!("Vault directory is writable");
                }
                Err(e) => {
                    error!("Vault directory is not writable: {}", e);
                    return Err(e.into());
                }
            }

            let storage = match Storage::new(vault_path) {
                Ok(s) => {
                    info!("Storage initialized successfully");
                    s
                }
                Err(e) => {
                    error!("Failed to initialize storage: {}", e);
                    return Err(Box::new(e));
                }
            };
            
            let crypto = Crypto::new();
            let vault_state = VaultState {
                storage: Mutex::new(storage),
                crypto: Mutex::new(crypto),
            };

            app.manage(vault_state);
            info!("Vault state managed successfully");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            is_vault_initialized,
            initialize_vault,
            unlock_vault,
            lock_vault,
            get_lockout_status,
            get_brute_force_config,
            set_brute_force_config,
            reset_failed_attempts,
            get_vault_items,
            add_text_item,
            add_file_item,
            add_folder,
            get_item_content,
            delete_item,
            permanently_delete_item,
            permanently_delete_all_items,
            restore_item,
            get_deleted_items,
            update_master_key,
            export_decrypted_vault,
            export_encrypted_vault,
            delete_vault,
            get_vault_status,
            get_key_derivation_strength,
            get_all_tags,
            rename_tag,
            delete_tag,
            import_csv,
            get_all_vault_items,
            get_theme,
            set_theme,
            update_item,
            restore_item_to_root,
            generate_totp,
            generate_qr_code
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_vault_status(state: State<'_, VaultState>) -> Result<VaultStatus> {
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    let strength = if storage.is_initialized() {
        Some(storage.get_key_derivation_strength()?)
    } else {
        None
    };
    Ok(VaultStatus {
        initialized: storage.is_initialized(),
        unlocked: crypto.is_unlocked(),
        strength,
    })
}

#[tauri::command]
fn get_key_derivation_strength(state: State<'_, VaultState>) -> Result<KeyDerivationStrength> {
    let storage = state.storage.lock().unwrap();
    if !storage.is_initialized() {
        return Err(Error::Internal("Vault not initialized".to_string()));
    }
    storage.get_key_derivation_strength()
}


#[tauri::command]
async fn is_vault_initialized(state: State<'_, VaultState>) -> Result<bool> {
    let storage = state.storage.lock().unwrap();
    Ok(storage.is_initialized())
}

#[tauri::command]
async fn initialize_vault(args: InitializeVaultArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Initializing vault.");
    let storage = state.storage.lock().unwrap();
    let mut crypto = state.crypto.lock().unwrap();

    if storage.is_initialized() {
        error!("Attempted to initialize an already initialized vault.");
        return Err(Error::VaultAlreadyInitialized);
    }
    
    let strength = args.strength.unwrap_or_default();
    info!("Generating salt and deriving key with strength: {:?}", strength);
    let salt = Crypto::generate_salt();
    let derived_key = crypto.derive_key(&args.master_key, &salt, strength)?;

    info!("Storing salt and strength.");
    storage.initialize(&salt, strength)?;

    info!("Unlocking crypto with new key.");
    crypto.unlock(&derived_key)?;

    info!("Creating and storing verification token.");
    let verification_data = Crypto::generate_verification_token();
    let encrypted_token = crypto.encrypt(&verification_data)?;
    storage.store_verification_token(&encrypted_token)?;

    info!("Vault initialized successfully.");
    Ok(())
}

#[tauri::command]
async fn unlock_vault(master_key: String, state: State<'_, VaultState>) -> Result<()> {
    info!("Attempting to unlock vault.");

    let storage = state.storage.lock().unwrap();

    // Security: Check persistent rate limiting
    let lockout_status = PersistentRateLimiter::check_and_update_lockout(&storage)?;
    if lockout_status.is_locked_out {
        error!("Account locked due to too many failed attempts. Remaining time: {} seconds", lockout_status.remaining_seconds);
        return Err(Error::InvalidInput(format!(
            "Account locked due to too many failed attempts. Please wait {} minutes before trying again.",
            (lockout_status.remaining_seconds + 59) / 60 // Round up to next minute
        )));
    }

    let mut crypto = state.crypto.lock().unwrap();

    let salt = storage.get_salt()?;
    let strength = storage.get_key_derivation_strength()?;
    let verification_token = storage.get_verification_token()?;

    let derived_key = crypto.derive_key(&master_key, &salt, strength)?;
    crypto.unlock(&derived_key)?;

    if crypto.decrypt(&verification_token).is_ok() {
        // Success: Reset failed attempts
        PersistentRateLimiter::reset_attempts(&storage)?;
        info!("Vault unlocked successfully with strength {:?}", strength);
        return Ok(());
    }

    // Failed attempt: Record it
    crypto.lock();
    PersistentRateLimiter::record_failed_attempt(&storage)?;
    error!("Invalid master key provided during unlock attempt.");
    Err(Error::InvalidMasterKey)
}

#[tauri::command]
async fn lock_vault(state: State<'_, VaultState>) -> Result<()> {
    info!("Locking vault.");
    state.crypto.lock().unwrap().lock();
    Ok(())
}

#[tauri::command]
async fn get_lockout_status(state: State<'_, VaultState>) -> Result<LockoutStatus> {
    let storage = state.storage.lock().unwrap();
    PersistentRateLimiter::check_and_update_lockout(&storage)
}

#[tauri::command]
async fn get_brute_force_config(state: State<'_, VaultState>) -> Result<fetch::storage::BruteForceConfig> {
    let storage = state.storage.lock().unwrap();
    storage.get_brute_force_config()
}

#[tauri::command]
async fn set_brute_force_config(config: fetch::storage::BruteForceConfig, state: State<'_, VaultState>) -> Result<()> {
    info!("Setting brute force protection configuration: {:?}", config);
    let storage = state.storage.lock().unwrap();
    storage.set_brute_force_config(config)?;

    // If brute force protection is disabled, reset any existing lockout
    if !config.enabled {
        storage.set_failed_login_attempts(0)?;
        storage.set_last_failed_attempt_timestamp(None)?;
        info!("Brute force protection disabled, reset failed attempts");
    }

    Ok(())
}

#[tauri::command]
async fn reset_failed_attempts(state: State<'_, VaultState>) -> Result<()> {
    info!("Manually resetting failed login attempts.");
    let storage = state.storage.lock().unwrap();
    PersistentRateLimiter::reset_attempts(&storage)
}

#[tauri::command]
async fn get_vault_items(
    parent_id: Option<String>,
    item_type: Option<String>,
    order_by: Option<SortOrder>,
    state: State<'_, VaultState>,
) -> Result<Vec<VaultItem>> {
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }
    storage.get_items(parent_id, item_type, order_by, &crypto)
}

#[tauri::command]
async fn add_text_item(args: AddTextItemArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Adding text item: {}", args.name);
    trace!("Received content length: {}", args.content.len());

    // Security: Enhanced input validation
    if args.name.trim().is_empty() || args.content.is_empty() {
        warn!("Attempted to add text item with empty name or content.");
        return Err(Error::InvalidInput("Item name and content cannot be empty".into()));
    }

    // Security: Validate name length and characters
    if args.name.len() > 255 {
        return Err(Error::InvalidInput("Item name too long (max 255 characters)".into()));
    }

    // Security: Validate content size (max 10MB)
    if args.content.len() > 10 * 1024 * 1024 {
        return Err(Error::InvalidInput("Content too large (max 10MB)".into()));
    }

    // Security: Validate tags
    for tag in &args.tags {
        if tag.len() > 50 {
            return Err(Error::InvalidInput("Tag name too long (max 50 characters)".into()));
        }
        if tag.contains('\0') || tag.contains('\n') || tag.contains('\r') {
            return Err(Error::InvalidInput("Tag contains invalid characters".into()));
        }
    }

    if args.tags.len() > 20 {
        return Err(Error::InvalidInput("Too many tags (max 20)".into()));
    }
    
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot add item.");
        return Err(Error::VaultLocked);
    }

    let now = Utc::now();
    let data_path = Uuid::new_v4().to_string(); 
    debug!("Generated data_path for text item: {}", data_path);

    let item = VaultItem {
        id: Uuid::new_v4().to_string(),
        parent_id: args.parent_id,
        name: args.name,
        data_path: data_path.clone(), 
        item_type: if args.item_type == "text" { "text/plain".to_string() } else { args.item_type }, 
        folder_type: None,
        tags: args.tags,
        created_at: now,
        updated_at: now,
        deleted_at: None,
        totp_secret: args.totp_secret,
    };

    let encrypted_content = crypto.encrypt(args.content.as_bytes())?;
    
    debug!("Encrypted content size for text item: {} bytes", encrypted_content.len());
    let full_file_path = storage.get_vault_path().join("data").join(&data_path);
    debug!("Attempting to write encrypted text content to: {}", full_file_path.display());

    storage.write_encrypted_file(&encrypted_content, &data_path)?;
    debug!("Successfully wrote encrypted file for text item ID: {}", item.id);

    storage.add_item(&item, &crypto)?;
    info!("Text item '{}' added successfully.", item.name);
    Ok(())
}

#[tauri::command]
async fn add_file_item(args: AddFileItemArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Adding file item: {}", args.name);

    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot add file item.");
        return Err(Error::VaultLocked);
    }

    let file_path = Path::new(&args.file_path);

    // Security: Validate file path to prevent directory traversal attacks
    let canonical_path = file_path.canonicalize()
        .map_err(|_| Error::InvalidInput("Invalid file path or file does not exist".into()))?;

    // Ensure the file path doesn't contain directory traversal sequences
    if args.file_path.contains("..") || args.file_path.contains("~") {
        return Err(Error::InvalidInput("File path contains invalid characters".into()));
    }

    let file_content = fs::read(&canonical_path)?;
    
    let guess = mime_guess::from_path(&canonical_path).first_or_octet_stream();
    let mime_type = guess.to_string();
    
    let now = Utc::now();
    let data_path = Uuid::new_v4().to_string();

    let item = VaultItem {
        id: Uuid::new_v4().to_string(),
        parent_id: args.parent_id,
        name: args.name,
        data_path: data_path.clone(),
        item_type: mime_type,
        folder_type: None,
        tags: args.tags,
        created_at: now,
        updated_at: now,
        deleted_at: None,
        totp_secret: None, // Files don't have TOTP
    };

    let encrypted_content = crypto.encrypt(&file_content)?;
    
    debug!("Encrypted content size for file item: {} bytes", encrypted_content.len());
    let full_file_path = storage.get_vault_path().join("data").join(&data_path);
    debug!("Attempting to write encrypted file content to: {}", full_file_path.display());

    storage.write_encrypted_file(&encrypted_content, &data_path)?;
    debug!("Successfully wrote encrypted file for file item ID: {}", item.id);
    storage.add_item(&item, &crypto)?;
    
    info!("File item '{}' added successfully.", item.name);
    Ok(())
}

#[tauri::command]
async fn add_folder(args: AddFolderArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Adding folder: {}", args.name);

    // Security: Enhanced folder validation
    if args.name.trim().is_empty() {
        warn!("Attempted to add folder with empty name.");
        return Err(Error::InvalidInput("Folder name cannot be empty".into()));
    }

    if args.name.len() > 255 {
        return Err(Error::InvalidInput("Folder name too long (max 255 characters)".into()));
    }

    // Security: Validate folder name characters
    if args.name.contains('\0') || args.name.contains('/') || args.name.contains('\\') {
        return Err(Error::InvalidInput("Folder name contains invalid characters".into()));
    }
    
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot add folder.");
        return Err(Error::VaultLocked);
    }

    let now = Utc::now();

    let item = VaultItem {
        id: Uuid::new_v4().to_string(),
        parent_id: args.parent_id,
        name: args.name,
        data_path: "".to_string(),
        item_type: "folder".to_string(),
        folder_type: args.folder_type,
        tags: vec![], 
        created_at: now,
        updated_at: now,
        deleted_at: None,
        totp_secret: None, // Folders don't have TOTP
    };
    
    storage.add_item(&item, &crypto)?;

    info!("Folder '{}' added successfully.", item.name);
    Ok(())
}

#[tauri::command]
async fn update_item(args: UpdateItemArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Updating item: {}", args.name);

    if args.name.trim().is_empty() {
        warn!("Attempted to update item with empty name.");
        return Err(Error::InvalidInput("Item name cannot be empty".into()));
    }

    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot update item.");
        return Err(Error::VaultLocked);
    }

    // get the existing item to preserve its data_path
    let existing_item = storage.get_item(&args.id, &crypto)?.ok_or_else(|| Error::ItemNotFound(args.id.clone()))?;
    
    let now = Utc::now();
    let item_type = args.item_type.clone(); // clone it so we can use it later
    let item = VaultItem {
        id: args.id,
        parent_id: args.parent_id,
        name: args.name,
        data_path: existing_item.data_path.clone(), // keep the same data_path
        item_type: args.item_type,
        folder_type: existing_item.folder_type, // preserve folder_type
        tags: args.tags,
        created_at: existing_item.created_at, // preserve creation date
        updated_at: now,
        deleted_at: existing_item.deleted_at,
        totp_secret: args.totp_secret.or(existing_item.totp_secret), // Update if provided, else keep existing
    };

    // update the encrypted content if it's a text item
    if item_type == "text" || item_type == "key" || item_type == "text/plain" {
        let encrypted_content = crypto.encrypt(args.content.as_bytes())?;
        storage.write_encrypted_file(&encrypted_content, &existing_item.data_path)?;
    }

    // update the item metadata
    storage.update_item_fields(&item, &crypto)?;
    
    info!("Item '{}' updated successfully.", item.name);
    Ok(())
}

#[tauri::command]
async fn get_item_content(id: String, state: State<'_, VaultState>) -> Result<Vec<u8>> {
    info!("Getting content for item: {}", id);
    
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot get item content");
        return Err(Error::VaultLocked);
    }

    let item = match storage.get_item(&id, &crypto) {
        Ok(Some(item)) => {
            info!("Found item: {} (type: {})", item.name, item.item_type);
            item
        }
        Ok(None) => {
            error!("Item not found: {}", id);
            return Err(Error::ItemNotFound(id.clone()));
        }
        Err(e) => {
            error!("Failed to get item {}: {}", id, e);
            return Err(e);
        }
    };
    
    info!("Reading encrypted file: {}", item.data_path);
    match storage.read_encrypted_file(&item.data_path, &crypto) {
        Ok(content) => {
            info!("Successfully read {} bytes for item: {}", content.len(), item.name);
            Ok(content)
        }
        Err(e) => {
            error!("Failed to read encrypted file for item {}: {}", item.name, e);
            Err(e)
        }
    }
}

#[tauri::command]
async fn delete_item(id: String, state: State<'_, VaultState>) -> Result<bool> {
    info!("Soft deleting item with id: {}", id);
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }
    storage.delete_item_and_descendants(&id, &crypto)?;
    Ok(true)
}

#[tauri::command]
async fn permanently_delete_item(id: String, state: State<'_, VaultState>) -> Result<bool> {
    info!("Permanently deleting item with id: {}", id);
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }
    storage.permanently_delete_item_and_descendants(&id, &crypto)?;
    Ok(true)
}

#[tauri::command]
async fn permanently_delete_all_items(state: State<'_, VaultState>) -> Result<bool> {
    info!("Permanently deleting all items in recycling bin");
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }
    storage.permanently_delete_all_deleted_items(&crypto)?;
    Ok(true)
}

#[tauri::command]
async fn restore_item(id: String, state: State<'_, VaultState>) -> Result<bool> {
    info!("Restoring item with id: {}", id);
    let storage = state.storage.lock().unwrap();
    if !state.crypto.lock().unwrap().is_unlocked() {
        return Err(Error::VaultLocked);
    }
    storage.restore_item(&id)
}

#[tauri::command]
async fn restore_item_to_root(id: String, state: State<'_, VaultState>) -> Result<bool> {
    info!("Restoring item to root with id: {}", id);
    let storage = state.storage.lock().unwrap();
    if !state.crypto.lock().unwrap().is_unlocked() {
        return Err(Error::VaultLocked);
    }
    storage.restore_item_to_root(&id)
}

#[tauri::command]
async fn get_deleted_items(state: State<'_, VaultState>) -> Result<Vec<VaultItem>> {
    info!("Getting all deleted items");
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }

    let all_items = storage.get_all_items_recursive(&crypto)?;
    let deleted_items = all_items.into_iter().filter(|item| item.deleted_at.is_some()).collect();
    Ok(deleted_items)
}

#[tauri::command]
async fn update_master_key(args: UpdateMasterKeyArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Starting master key update process.");
    let storage = state.storage.lock().unwrap();
    let mut crypto = state.crypto.lock().unwrap();

    let current_salt = storage.get_salt()?;
    let current_strength = storage.get_key_derivation_strength()?;
    let verification_token = storage.get_verification_token()?;
    let derived_key = crypto.derive_key(&args.current_key, &current_salt, current_strength)?;
    
    crypto.unlock(&derived_key)?;
    if crypto.decrypt(&verification_token).is_err() {
        crypto.lock();
        error!("Invalid current master key during update attempt.");
        return Err(Error::InvalidMasterKey);
    }
    info!("Current master key verified.");

    let new_strength = args.strength.unwrap_or(current_strength);
    let new_salt = Crypto::generate_salt();
    let new_derived_key = crypto.derive_key(&args.new_key, &new_salt, new_strength)?;
    let mut temp_crypto_for_reencrypt = Crypto::new();
    temp_crypto_for_reencrypt.unlock(&new_derived_key)?;

    let all_items = storage.get_all_items_recursive(&crypto)?;
    info!("Re-encrypting {} items with new master key...", all_items.len());

    for item in &all_items {
        storage.update_item_fields(item, &temp_crypto_for_reencrypt)?;

        if !item.data_path.is_empty() {
             let decrypted_content = storage.read_encrypted_file(&item.data_path, &crypto)?;
             let re_encrypted_content = temp_crypto_for_reencrypt.encrypt(&decrypted_content)?;
             storage.write_encrypted_file(&re_encrypted_content, &item.data_path)?;
        }
    }
    
    let decrypted_verification_token = crypto.decrypt(&verification_token)?;
    let new_encrypted_token = temp_crypto_for_reencrypt.encrypt(&decrypted_verification_token)?;
    storage.store_verification_token(&new_encrypted_token)?;

    storage.update_salt(&new_salt)?;
    storage.set_key_derivation_strength(new_strength)?;

    *crypto = temp_crypto_for_reencrypt;

    info!("Master key updated successfully.");
    Ok(())
}

#[tauri::command]
async fn export_decrypted_vault(args: ExportVaultArgs, state: State<'_, VaultState>) -> Result<String> {
    info!("Exporting decrypted vault in {} format.", args.format);

    let derived_key = {
        let storage = state.storage.lock().unwrap();
        let salt = storage.get_salt()?;
        let temp_crypto = Crypto::new();
        let strength = storage.get_key_derivation_strength()?;
        let verification_token = storage.get_verification_token()?;

        let key = temp_crypto.derive_key(&args.master_key, &salt, strength)?;
        let mut checker_crypto = Crypto::new();
        checker_crypto.unlock(&key)?;
        
        if checker_crypto.decrypt(&verification_token).is_err() {
            return Err(Error::InvalidMasterKey);
        }
        key
    };

    let mut crypto = state.crypto.lock().unwrap();
    crypto.unlock(&derived_key)?;
    
    let storage = state.storage.lock().unwrap();
    let items = storage.get_all_items_recursive(&crypto)?;
    
    match args.format.as_str() {
        "json" => {
            // JSON format (pretty-printed)
            let mut decrypted_items = Vec::new();
            for item in items {
                if !item.data_path.is_empty() {
                    let content = storage.read_encrypted_file(&item.data_path, &crypto)?;
                    let mut decrypted_item = serde_json::to_value(item)?;
                    decrypted_item["content"] = serde_json::Value::String(STANDARD.encode(&content));
                    decrypted_items.push(decrypted_item);
                } else {
                    decrypted_items.push(serde_json::to_value(item)?);
                }
            }
            Ok(serde_json::to_string_pretty(&decrypted_items)?)
        },
        "csv" => {
            // CSV format
            let mut csv_output = String::new();
            csv_output.push_str("Name,Type,Content,Tags,Created At,Updated At\n");
            
            for item in items {
                let content = if !item.data_path.is_empty() {
                    String::from_utf8_lossy(&storage.read_encrypted_file(&item.data_path, &crypto)?).to_string()
                } else {
                    String::new()
                };
                
                let tags = item.tags.join(";");
                let csv_line = format!(
                    "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
                    item.name.replace("\"", "\"\""),
                    item.item_type.replace("\"", "\"\""),
                    content.replace("\"", "\"\""),
                    tags.replace("\"", "\"\""),
                    item.created_at,
                    item.updated_at
                );
                csv_output.push_str(&csv_line);
            }
            Ok(csv_output)
        },
        "txt" => {
            // Plain text format
            let mut text_output = String::new();
            for item in items {
                text_output.push_str(&format!("=== {} ===\n", item.name));
                text_output.push_str(&format!("Type: {}\n", item.item_type));
                if !item.tags.is_empty() {
                    text_output.push_str(&format!("Tags: {}\n", item.tags.join(", ")));
                }
                text_output.push_str(&format!("Created: {}\n", item.created_at));
                text_output.push_str(&format!("Updated: {}\n", item.updated_at));
                
                if !item.data_path.is_empty() {
                    let encrypted_content = storage.read_encrypted_file(&item.data_path, &crypto)?;
                    let content = String::from_utf8_lossy(&encrypted_content);
                    text_output.push_str("\nContent:\n");
                    text_output.push_str(&content);
                }
                text_output.push_str("\n\n");
            }
            Ok(text_output)
        },
        "md" => {
            // Markdown format
            let mut md_output = String::new();
            md_output.push_str("# Vault Export\n\n");
            
            for item in items {
                md_output.push_str(&format!("## {}\n\n", item.name));
                md_output.push_str(&format!("**Type:** {}\n\n", item.item_type));
                
                if !item.tags.is_empty() {
                    md_output.push_str("**Tags:** ");
                    for (i, tag) in item.tags.iter().enumerate() {
                        md_output.push_str(&format!("`{}`", tag));
                        if i < item.tags.len() - 1 {
                            md_output.push_str(", ");
                        }
                    }
                    md_output.push_str("\n\n");
                }
                
                md_output.push_str(&format!("**Created:** {}\n\n", item.created_at));
                md_output.push_str(&format!("**Updated:** {}\n\n", item.updated_at));
                
                if !item.data_path.is_empty() {
                    let encrypted_content = storage.read_encrypted_file(&item.data_path, &crypto)?;
                    let content = String::from_utf8_lossy(&encrypted_content);
                    md_output.push_str("### Content\n\n");
                    md_output.push_str("```\n");
                    md_output.push_str(&content);
                    md_output.push_str("\n```\n\n");
                }
                
                md_output.push_str("---\n\n");
            }
            Ok(md_output)
        },
        _ => Err(Error::InvalidInput("Unsupported export format".into())),
    }
}

#[tauri::command]
async fn export_encrypted_vault(state: State<'_, VaultState>) -> Result<Vec<u8>> {
    info!("Exporting encrypted vault as a zip archive.");
    let storage = state.storage.lock().unwrap();
    let vault_path = storage.get_vault_path();
    
    let buffer = {
        let buffer: Vec<u8> = Vec::new();
        let cursor = std::io::Cursor::new(buffer);
        let mut zip = ZipWriter::new(cursor);
        
        let options = FileOptions::default().compression_method(zip::CompressionMethod::Stored);

        let walkdir = WalkDir::new(vault_path);
        let it = walkdir.into_iter();

        for entry in it.filter_map(|e| e.ok()) {
            let path = entry.path();
            let name = path.strip_prefix(Path::new(vault_path)).unwrap();

            if path.is_file() {
                zip.start_file(name.to_str().unwrap(), options)?;
                let mut f = File::open(path)?;
                let mut contents = Vec::new();
                f.read_to_end(&mut contents)?;
                zip.write_all(&contents)?;
            } else if !name.as_os_str().is_empty() {
                zip.add_directory(name.to_str().unwrap(), options)?;
            }
        }
        
        let cursor = zip.finish()?;
        cursor.into_inner()
    };
    
    info!("Encrypted vault export successful.");
    Ok(buffer)
}

#[tauri::command]
async fn delete_vault(args: DeleteVaultArgs, _app_handle: AppHandle<Wry>, state: State<'_, VaultState>) -> Result<()> {
    info!("Starting vault deletion process.");
    
    let storage = state.storage.lock().unwrap();
    let salt = storage.get_salt()?;
    let strength = storage.get_key_derivation_strength()?;
    let temp_crypto = Crypto::new();
    let verification_token = storage.get_verification_token()?;

    let key = temp_crypto.derive_key(&args.master_key, &salt, strength)?;
    let mut checker_crypto = Crypto::new();
    checker_crypto.unlock(&key)?;
    
    if checker_crypto.decrypt(&verification_token).is_err() {
        return Err(Error::InvalidMasterKey);
    }

    // reset the storage state (clear database and data files)
    storage.reset()?;
    
    // lock the crypto state (security first!)
    state.crypto.lock().unwrap().lock();
    
    info!("Vault deleted and state reset successfully.");
    Ok(())
}

#[tauri::command]
async fn get_all_tags(state: State<'_, VaultState>) -> Result<Vec<String>> {
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }
    
    let all_items = storage.get_all_items_recursive(&crypto)?;
    let mut tags: Vec<String> = all_items.into_iter()
        .flat_map(|item| item.tags)
        .collect();
    
    tags.sort_unstable();
    tags.dedup(); // remove duplicates (no tag twins)
    
    Ok(tags)
}

#[tauri::command]
async fn rename_tag(args: RenameTagArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Renaming tag from '{}' to '{}'", args.old_tag_name, args.new_tag_name);
    if args.new_tag_name.trim().is_empty() {
        warn!("Attempted to rename tag to an empty string.");
        return Err(Error::InvalidInput("New tag name cannot be empty".into()));
    }
    
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot rename tag.");
        return Err(Error::VaultLocked);
    }
    
    storage.rename_tag_in_all_items(&args.old_tag_name, &args.new_tag_name, &crypto)?;
    info!("Tag '{}' successfully renamed to '{}'.", args.old_tag_name, args.new_tag_name);
    Ok(())
}

#[tauri::command]
async fn delete_tag(args: DeleteTagArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Deleting tag: {}", args.tag_name);
    
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot delete tag.");
        return Err(Error::VaultLocked);
    }
    
    storage.remove_tag_from_all_items(&args.tag_name, &crypto)?;
    info!("Tag '{}' successfully deleted from all items.", args.tag_name);
    Ok(())
}

#[tauri::command]
async fn import_csv(args: CsvImportArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Importing CSV content.");

    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot import CSV content.");
        return Err(Error::VaultLocked);
    }

    let csv_content = &args.csv_content;
    let parent_id = args.parent_id;

    info!("CSV content length: {} bytes", csv_content.len());
    // Security: Never log CSV content as it may contain sensitive passwords

    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(csv_content.as_bytes());

    let mut imported_count = 0;
    let mut row_count = 0;

    for result in reader.deserialize() {
        row_count += 1;
        match result {
            Ok(row) => {
                let row: CsvRow = row;
                
                // extract data from either format (csv is flexible like that)
                let title = row.account
                    .or(row.title)
                    .or(row.name_browser)
                    .or(row.hostname_browser)
                    .or_else(|| {
                        row.web_site.as_ref()
                            .or(row.url.as_ref())
                            .or(row.url_browser.as_ref())
                            .and_then(|url| {
                                url.replace("https://", "")
                                   .replace("http://", "")
                                   .split('/')
                                   .next()
                                   .map(|s| s.to_string())
                            })
                    });
                
                let username = row.login_name.or(row.username).or(row.username_browser);
                let password = row.password.or(row.password_browser);
                let url = row.web_site.or(row.url).or(row.url_browser);
                let notes = row.comments.or(row.notes);
                let tags = row.tags;
                
                info!("Processing row {}: has_title = {}, has_username = {}", row_count, title.is_some(), username.is_some());
                
                // skip rows without a title because they're fucking stupid and useless
                if title.is_none() || title.as_ref().unwrap().trim().is_empty() {
                    info!("Skipping row {} - no title", row_count);
                    continue;
                }

                // create the content for the password item (let's organize this mess)
                let mut content = String::new();
                if let Some(username_val) = &username {
                    if !username_val.trim().is_empty() {
                        content.push_str(&format!("Username: {}\n\n", username_val.trim()));
                    }
                }
                if let Some(password_val) = &password {
                    if !password_val.trim().is_empty() {
                        content.push_str(&format!("Password: {}\n\n", password_val.trim()));
                    }
                }
                if let Some(url_val) = &url {
                    if !url_val.trim().is_empty() {
                        content.push_str(&format!("URL: {}\n\n", url_val.trim()));
                    }
                }
                if let Some(notes_val) = &notes {
                    if !notes_val.trim().is_empty() {
                        content.push_str(&format!("Notes: {}\n\n", notes_val.trim()));
                    }
                }
                let content = content.trim_end().to_string();
                info!("Created content for row {} (length: {})", row_count, content.len());
                
                // skip rows with no content
                if content.trim().is_empty() {
                    info!("Skipping row {} - no content to store", row_count);
                    continue;
                }
                
                // parse tags
                let tags_vec: Vec<String> = tags
                    .unwrap_or_default()
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();

                info!("Parsed tags for row {}: {:?}", row_count, tags_vec);

                // create the vault item
                let item = VaultItem {
                    id: Uuid::new_v4().to_string(),
                    parent_id: parent_id.clone(),
                    name: title.unwrap().trim().to_string(),
                    data_path: "".to_string(),
                    item_type: "key".to_string(),
                    folder_type: None,
                    tags: tags_vec,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                    deleted_at: None,
                    totp_secret: None,
                };

                info!("Created vault item for row {}: {} (id: {})", row_count, item.name, item.id);

                // add the item to storage
                storage.add_item(&item, &crypto)?;
                info!("Added item to storage for row {}", row_count);
                
                // write the content to a file
                let file_name = format!("{}.txt", item.id);
                info!("Writing content to file: {} (content length: {})", file_name, content.len());
                let encrypted_content = crypto.encrypt(content.as_bytes())?;
                storage.write_encrypted_file(&encrypted_content, &file_name)?;
                info!("Successfully wrote encrypted content to file: {}", file_name);
                
                // update the item with the correct data path
                let mut updated_item = item.clone();
                updated_item.data_path = file_name.clone();
                storage.update_item_fields(&updated_item, &crypto)?;
                info!("Updated item data_path to: {}", file_name);
                
                imported_count += 1;
                info!("Successfully imported row {}: {}", row_count, item.name);
            }
            Err(e) => {
                error!("Error parsing row {}: {}", row_count, e);
                return Err(Error::Csv(format!("Error parsing row {}: {}", row_count, e)));
            }
        }
    }

    info!("CSV import successful. Processed {} rows, imported {} items.", row_count, imported_count);
    Ok(())
}

#[tauri::command]
async fn get_all_vault_items(state: State<'_, VaultState>) -> Result<Vec<VaultItem>> {
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }
    storage.get_all_items_recursive(&crypto)
}

#[tauri::command]
async fn get_theme(state: State<'_, VaultState>) -> Result<String> {
    let storage = state.storage.lock().unwrap();
    let theme = storage.get_theme()?;
    Ok(theme)
}

#[tauri::command]
async fn set_theme(theme: String, state: State<'_, VaultState>) -> Result<()> {
    info!("Setting theme to: {}", theme);
    let storage = state.storage.lock().unwrap();
    storage.set_theme(&theme)
}

#[tauri::command]
async fn generate_totp(secret: String) -> Result<String> {
    use totp_rs::{Algorithm, TOTP};
    info!("Generating TOTP code for secret (length: {})", secret.len());

    let secret_bytes = STANDARD.decode(secret)
        .map_err(|e| Error::Internal(format!("Failed to decode TOTP secret: {}", e)))?;

    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret_bytes,
        None, // issuer - not needed for code generation
        "".to_string(), // account name - not needed for code generation
    ).map_err(|e| Error::Internal(format!("Failed to create TOTP instance: {}", e)))?;

    let code = totp.generate_current()
        .map_err(|e| Error::Internal(format!("Failed to generate TOTP code: {}", e)))?;
    
    info!("Successfully generated TOTP code.");
    Ok(code)
}

#[tauri::command]
async fn generate_qr_code(item_name: String, issuer: String, secret: String) -> Result<String> {
    use totp_rs::{Algorithm, TOTP};
    info!("Generating QR code for item: {}, issuer: {}", item_name, issuer);

    let secret_bytes = STANDARD.decode(&secret) // Ensure secret is base64 decoded
        .map_err(|e| Error::Internal(format!("Failed to decode TOTP secret for QR: {}", e)))?;

    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret_bytes,
        Some(issuer),
        item_name,
    ).map_err(|e| Error::Internal(format!("Failed to create TOTP instance for QR: {}", e)))?;

    match totp.get_qr_base64() {
        Ok(qr_base64) => {
            info!("Successfully generated QR code image (base64).");
            Ok(qr_base64)
        }
        Err(e) => {
            error!("Failed to generate QR code: {:?}", e);
            Err(Error::Internal(format!("QR generation failed: {}", e)))
        }
    }
}
