use crate::crypto::{Crypto, KeyDerivationStrength};
use crate::error::Error;
use crate::Result;
use chrono::{DateTime, Utc};
use log::{error, info, debug, trace, warn};
use rusqlite::{params, Connection, Result as RusqliteResult, Row};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{PathBuf, Path};
use std::sync::Mutex;
use std::io::{Write, Seek, SeekFrom};
use std::string::FromUtf8Error;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
#[allow(unused_imports)]
use std::fs::Permissions;


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultItem {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub data_path: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub folder_type: Option<String>,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deleted_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub totp_secret: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, Default)]
pub enum SortOrder {
    #[default]
    CreatedAtDesc,
    CreatedAtAsc,
    NameAsc,
    NameDesc,
    UpdatedAtDesc,
    UpdatedAtAsc,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub struct BruteForceConfig {
    pub enabled: bool,
    pub max_attempts: u32,
    pub lockout_duration_minutes: u32,
}

impl Default for BruteForceConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_attempts: 5,
            lockout_duration_minutes: 5,
        }
    }
}

pub struct Storage {
    vault_path: PathBuf,
    conn: Mutex<Connection>,
}

impl Storage {
    pub fn new(vault_path: PathBuf) -> Result<Self> {
        fs::create_dir_all(&vault_path)?;

        let db_path = vault_path.join("vault.db");
        let conn = Connection::open(&db_path)?;

        #[cfg(unix)]
        {
            let perms = Permissions::from_mode(0o600);
            if let Err(e) = fs::set_permissions(&db_path, perms) {
                error!("Failed to set permissions for database file {}: {}", db_path.display(), e);      
            }
        }

        conn.execute(
            "CREATE TABLE IF NOT EXISTS vault_items (
                id TEXT PRIMARY KEY,
                parent_id TEXT,
                name BLOB NOT NULL,
                item_type BLOB NOT NULL,
                data_path BLOB NOT NULL,
                folder_type BLOB,
                tags BLOB,
                created_at BLOB NOT NULL,
                updated_at BLOB NOT NULL,
                deleted_at BLOB,
                totp_secret BLOB
            )",
            [],
        )?;
        
        {
            // migration: add deleted_at and totp_secret columns if they don't exist
            let mut stmt = conn.prepare("PRAGMA table_info(vault_items)")?;
            let column_names_map = stmt.query_map([], |row| row.get::<_, String>(1))?;
            let columns: Vec<String> = column_names_map.collect::<RusqliteResult<Vec<String>>>().map_err(Error::from)?;
            
            if !columns.contains(&"deleted_at".to_string()) {
                info!("Migrating database: Adding deleted_at column to vault_items");
                conn.execute("ALTER TABLE vault_items ADD COLUMN deleted_at BLOB", [])?;
            }

            // migration: add totp_secret column if it doesn't exist
            if !columns.contains(&"totp_secret".to_string()) {
                info!("Migrating database: Adding totp_secret column to vault_items");
                conn.execute("ALTER TABLE vault_items ADD COLUMN totp_secret BLOB", [])?;
            }
        }

        conn.execute(
            "CREATE TABLE IF NOT EXISTS vault_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        fs::create_dir_all(vault_path.join("data"))?;

        Ok(Self {
            vault_path,
            conn: Mutex::new(conn),
        })
    }

    fn clean_url_for_sorting(name: &str) -> String {
        name.replace("https://", "")
            .replace("http://", "")
            .replace("www.", "")
            .to_lowercase()
    }

    fn row_to_vault_item(row: &Row, crypto: &Crypto) -> RusqliteResult<VaultItem> {
        let encrypted_name: Vec<u8> = row.get(2)?;
        let name = String::from_utf8(crypto.decrypt(&encrypted_name).map_err(|e| rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Blob, e.into()))?)
            .map_err(|e: FromUtf8Error| rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Blob, Box::new(e)))?;

        let encrypted_item_type: Vec<u8> = row.get(3)?;
        let item_type = String::from_utf8(crypto.decrypt(&encrypted_item_type).map_err(|e| rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Blob, e.into()))?)
            .map_err(|e: FromUtf8Error| rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Blob, Box::new(e)))?;
        
        let encrypted_data_path: Vec<u8> = row.get(4)?;
        let data_path = String::from_utf8(crypto.decrypt(&encrypted_data_path).map_err(|e| rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Blob, e.into()))?)
            .map_err(|e: FromUtf8Error| rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Blob, Box::new(e)))?;

        let encrypted_folder_type: Option<Vec<u8>> = row.get(5)?;
        let folder_type = match encrypted_folder_type {
            Some(encrypted) => Some(String::from_utf8(crypto.decrypt(&encrypted).map_err(|e| rusqlite::Error::FromSqlConversionFailure(5, rusqlite::types::Type::Blob, e.into()))?)
                .map_err(|e: FromUtf8Error| rusqlite::Error::FromSqlConversionFailure(5, rusqlite::types::Type::Blob, Box::new(e)))?),
            None => None,
        };

        let encrypted_tags: Vec<u8> = row.get(6)?;
        let tags_json = String::from_utf8(crypto.decrypt(&encrypted_tags).map_err(|e| rusqlite::Error::FromSqlConversionFailure(6, rusqlite::types::Type::Blob, e.into()))?)
            .map_err(|e: FromUtf8Error| rusqlite::Error::FromSqlConversionFailure(6, rusqlite::types::Type::Blob, Box::new(e)))?;
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_else(|_| vec![]);

        let encrypted_created_at: Vec<u8> = row.get(7)?;
        let created_at_str = String::from_utf8(crypto.decrypt(&encrypted_created_at).map_err(|e| rusqlite::Error::FromSqlConversionFailure(7, rusqlite::types::Type::Blob, e.into()))?)
            .map_err(|e: FromUtf8Error| rusqlite::Error::FromSqlConversionFailure(7, rusqlite::types::Type::Blob, Box::new(e)))?;
        let created_at = created_at_str.parse().map_err(|e| rusqlite::Error::FromSqlConversionFailure(7, rusqlite::types::Type::Text, Box::new(e)))?;
        
        let encrypted_updated_at: Vec<u8> = row.get(8)?;
        let updated_at_str = String::from_utf8(crypto.decrypt(&encrypted_updated_at).map_err(|e| rusqlite::Error::FromSqlConversionFailure(8, rusqlite::types::Type::Blob, e.into()))?)
            .map_err(|e: FromUtf8Error| rusqlite::Error::FromSqlConversionFailure(8, rusqlite::types::Type::Blob, Box::new(e)))?;
        let updated_at = updated_at_str.parse().map_err(|e| rusqlite::Error::FromSqlConversionFailure(8, rusqlite::types::Type::Text, Box::new(e)))?;

        let encrypted_deleted_at: Option<Vec<u8>> = row.get(9)?;
        let deleted_at = match encrypted_deleted_at {
            Some(encrypted) => {
                if encrypted.is_empty() {
                    None
                } else {
                    let deleted_at_str = String::from_utf8(crypto.decrypt(&encrypted).map_err(|e| rusqlite::Error::FromSqlConversionFailure(9, rusqlite::types::Type::Blob, e.into()))?)
                        .map_err(|e: FromUtf8Error| rusqlite::Error::FromSqlConversionFailure(9, rusqlite::types::Type::Blob, Box::new(e)))?;
                    Some(deleted_at_str.parse().map_err(|e| rusqlite::Error::FromSqlConversionFailure(9, rusqlite::types::Type::Text, Box::new(e)))?)
                }
            },
            None => None,
        };

        Ok(VaultItem {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            name,
            item_type,
            data_path,
            folder_type,
            tags,
            created_at,
            updated_at,
            deleted_at,
            totp_secret: {
                let encrypted_totp_secret: Option<Vec<u8>> = row.get(10)?;
                match encrypted_totp_secret {
                    Some(encrypted) => {
                        if encrypted.is_empty() {
                            None
                        } else {
                            Some(String::from_utf8(crypto.decrypt(&encrypted).map_err(|e| rusqlite::Error::FromSqlConversionFailure(10, rusqlite::types::Type::Blob, e.into()))?)
                                .map_err(|e: FromUtf8Error| rusqlite::Error::FromSqlConversionFailure(10, rusqlite::types::Type::Blob, Box::new(e)))?)
                        }
                    },
                    None => None,
                }
            }
        })
    }

    pub fn add_item(&self, item: &VaultItem, crypto: &Crypto) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tags_json = serde_json::to_string(&item.tags)?;

        let encrypted_name = crypto.encrypt(item.name.as_bytes())?;
        let encrypted_item_type = crypto.encrypt(item.item_type.as_bytes())?;
        let encrypted_data_path = crypto.encrypt(item.data_path.as_bytes())?;
        let encrypted_tags = crypto.encrypt(tags_json.as_bytes())?;
        let encrypted_folder_type = match &item.folder_type {
            Some(ft) => Some(crypto.encrypt(ft.as_bytes())?),
            None => None,
        };
        let encrypted_created_at = crypto.encrypt(item.created_at.to_rfc3339().as_bytes())?;
        let encrypted_updated_at = crypto.encrypt(item.updated_at.to_rfc3339().as_bytes())?;
        let encrypted_deleted_at = match &item.deleted_at {
            Some(dt) => Some(crypto.encrypt(dt.to_rfc3339().as_bytes())?),
            None => None,
        };
        let encrypted_totp_secret = match &item.totp_secret {
            Some(secret) => Some(crypto.encrypt(secret.as_bytes())?),
            None => None,
        };

        conn.execute(
            "INSERT INTO vault_items (id, parent_id, name, item_type, data_path, folder_type, tags, created_at, updated_at, deleted_at, totp_secret) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                item.id,
                item.parent_id,
                encrypted_name,
                encrypted_item_type,
                encrypted_data_path,
                encrypted_folder_type,
                encrypted_tags,
                encrypted_created_at,
                encrypted_updated_at,
                encrypted_deleted_at,
                encrypted_totp_secret,
            ],
        )?;
        Ok(())
    }
    
    pub fn update_item_fields(&self, item: &VaultItem, crypto: &Crypto) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tags_json = serde_json::to_string(&item.tags)?;

        let encrypted_name = crypto.encrypt(item.name.as_bytes())?;
        let encrypted_item_type = crypto.encrypt(item.item_type.as_bytes())?;
        let encrypted_data_path = crypto.encrypt(item.data_path.as_bytes())?;
        let encrypted_tags = crypto.encrypt(tags_json.as_bytes())?;
        let encrypted_folder_type = match &item.folder_type {
            Some(ft) => Some(crypto.encrypt(ft.as_bytes())?),
            None => None,
        };
        let encrypted_created_at = crypto.encrypt(item.created_at.to_rfc3339().as_bytes())?;
        let encrypted_updated_at = crypto.encrypt(item.updated_at.to_rfc3339().as_bytes())?;
        let encrypted_deleted_at = match &item.deleted_at {
            Some(dt) => Some(crypto.encrypt(dt.to_rfc3339().as_bytes())?),
            None => None,
        };
        let encrypted_totp_secret = match &item.totp_secret {
            Some(secret) => Some(crypto.encrypt(secret.as_bytes())?),
            None => None,
        };
        
        conn.execute(
            "UPDATE vault_items SET parent_id = ?2, name = ?3, item_type = ?4, data_path = ?5, folder_type = ?6, tags = ?7, created_at = ?8, updated_at = ?9, deleted_at = ?10, totp_secret = ?11 WHERE id = ?1",
            params![
                item.id,
                item.parent_id,
                encrypted_name,
                encrypted_item_type,
                encrypted_data_path,
                encrypted_folder_type,
                encrypted_tags,
                encrypted_created_at,
                encrypted_updated_at,
                encrypted_deleted_at,
                encrypted_totp_secret,
            ],
        )?;

        Ok(())
    }

    pub fn get_items(
        &self,
        parent_id: Option<String>,
        item_type_filter: Option<String>,
        order_by: Option<SortOrder>,
        crypto: &Crypto,
    ) -> Result<Vec<VaultItem>> {
        let conn = self.conn.lock().unwrap();
    
        let all_items_result: RusqliteResult<Vec<VaultItem>> = if let Some(pid) = parent_id {
            let sql = "SELECT * FROM vault_items WHERE parent_id = ?1";
            let mut stmt = conn.prepare(sql)?;
            let item_iter = stmt.query_map(params![pid], |row| Self::row_to_vault_item(row, crypto))?;
            item_iter.collect()
        } else {
            let sql = "SELECT * FROM vault_items WHERE parent_id IS NULL";
            let mut stmt = conn.prepare(sql)?;
            let item_iter = stmt.query_map(params![], |row| Self::row_to_vault_item(row, crypto))?;
            item_iter.collect()
        };
        
        let mut all_items = all_items_result?;
        
        // sort by cleaned url after decryption
        let sort_order = order_by.unwrap_or_default();
        all_items.sort_by(|a, b| {
            // folders always come first
            if a.item_type == "folder" && b.item_type != "folder" {
                return std::cmp::Ordering::Less;
            }
            if a.item_type != "folder" && b.item_type == "folder" {
                return std::cmp::Ordering::Greater;
            }
            
            // if both are folders or both are not folders, sort normally
            match sort_order {
                SortOrder::CreatedAtDesc => b.created_at.cmp(&a.created_at),
                SortOrder::CreatedAtAsc => a.created_at.cmp(&b.created_at),
                SortOrder::NameAsc => {
                    let a_clean = Self::clean_url_for_sorting(&a.name);
                    let b_clean = Self::clean_url_for_sorting(&b.name);
                    a_clean.cmp(&b_clean)
                },
                SortOrder::NameDesc => {
                    let a_clean = Self::clean_url_for_sorting(&a.name);
                    let b_clean = Self::clean_url_for_sorting(&b.name);
                    b_clean.cmp(&a_clean)
                },
                SortOrder::UpdatedAtDesc => b.updated_at.cmp(&a.updated_at),
                SortOrder::UpdatedAtAsc => a.updated_at.cmp(&b.updated_at),
            }
        });
    
        if let Some(filter) = item_type_filter {
            let filtered_items = all_items
                .into_iter()
                .filter(|item| {
                    if item.item_type == "folder" {
                        item.folder_type.as_deref() == Some(&filter)
                    } else {
                        item.item_type.starts_with(&filter)
                    }
                })
                .collect();
            Ok(filtered_items)
        } else {
            Ok(all_items)
        }
    }
    
    pub fn get_all_items_recursive(&self, crypto: &Crypto) -> Result<Vec<VaultItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM vault_items")?;
        let item_iter = stmt.query_map([], |row| Self::row_to_vault_item(row, crypto))?;

        let mut items = Vec::new();
        for item in item_iter {
            items.push(item?);
        }
        
        // sort by cleaned url (default to nameasc)
        items.sort_by(|a, b| {
            // folders are always on top and not a bottom bitch 
            if a.item_type == "folder" && b.item_type != "folder" {
                return std::cmp::Ordering::Less;
            }
            if a.item_type != "folder" && b.item_type == "folder" {
                return std::cmp::Ordering::Greater;
            }
            
            // if both are folders or both are not folders, sort alphabetically
            let a_clean = Self::clean_url_for_sorting(&a.name);
            let b_clean = Self::clean_url_for_sorting(&b.name);
            a_clean.cmp(&b_clean)
        });
        
        Ok(items)
    }

    pub fn get_item(&self, id: &str, crypto: &Crypto) -> Result<Option<VaultItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT * FROM vault_items WHERE id = ?1")?;
        let mut rows = stmt.query_map(params![id], |row| Self::row_to_vault_item(row, crypto))?;
        rows.next().transpose().map_err(Error::from)
    }

    fn write_shred_pattern(file_path: &Path, pattern_byte: u8) -> std::io::Result<()> {
        info!("Shredding file: {}", file_path.display());
        let mut file = fs::OpenOptions::new().write(true).read(true).open(file_path)?;
        let file_size = file.metadata()?.len();
        let buffer_size = 4096;
        let buffer = vec![pattern_byte; buffer_size];

        file.seek(SeekFrom::Start(0))?;

        let mut bytes_written = 0;
        while bytes_written < file_size {
            let to_write = std::cmp::min(buffer_size as u64, file_size - bytes_written) as usize;
            file.write_all(&buffer[..to_write])?;
            bytes_written += to_write as u64;
        }
        file.flush()?;
        file.sync_all()?; // Security: Force sync to disk
        Ok(())
    }

    // Security: Enhanced secure deletion with multiple passes
    fn secure_shred_file(file_path: &Path) -> std::io::Result<()> {
        info!("Performing secure shred on file: {}", file_path.display());

        // Multiple pass shredding for better security
        let patterns = [0x00, 0xFF, 0xAA, 0x55];

        for &pattern in &patterns {
            Self::write_shred_pattern(file_path, pattern)?;
        }

        // Final pass with random data
        let mut file = fs::OpenOptions::new().write(true).open(file_path)?;
        let file_size = file.metadata()?.len();
        let buffer_size = 4096;

        use rand::RngCore;
        let mut rng = rand::rngs::OsRng;

        file.seek(SeekFrom::Start(0))?;
        let mut bytes_written = 0;
        while bytes_written < file_size {
            let to_write = std::cmp::min(buffer_size as u64, file_size - bytes_written) as usize;
            let mut random_buffer = vec![0u8; to_write];
            rng.fill_bytes(&mut random_buffer);
            file.write_all(&random_buffer)?;
            bytes_written += to_write as u64;
        }
        file.flush()?;
        file.sync_all()?;

        Ok(())
    }

    pub fn delete_item_and_descendants(&self, id: &str, crypto: &Crypto) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
    
        let mut ids_to_delete = Vec::new();
        let mut queue = vec![id.to_string()];
    
        {
            let mut get_children_stmt = tx.prepare("SELECT id FROM vault_items WHERE parent_id = ?1")?;
            while let Some(current_id) = queue.pop() {
                let children_ids: Vec<String> = get_children_stmt
                    .query_map(params![&current_id], |row| row.get(0))?
                    .collect::<RusqliteResult<_>>()?;
    
                queue.extend(children_ids);
                ids_to_delete.push(current_id);
            }
        }
    
        if ids_to_delete.is_empty() {
            tx.commit()?;
            return Ok(());
        }
    
        let now = Utc::now();
        let encrypted_deleted_at = crypto.encrypt(now.to_rfc3339().as_bytes())?;
    
        {
            let placeholders = ids_to_delete.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!("UPDATE vault_items SET deleted_at = ?1 WHERE id IN ({})", placeholders);
            let mut params_vec: Vec<&dyn rusqlite::ToSql> = vec![&encrypted_deleted_at];
            for id in &ids_to_delete {
                params_vec.push(id);
            }
            tx.execute(&sql, rusqlite::params_from_iter(params_vec))?;
        }
    
        tx.commit()?;
    
        Ok(())
    }
    
    pub fn permanently_delete_item_and_descendants(&self, id: &str, crypto: &Crypto) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let mut ids_to_delete = Vec::new();
        let mut queue = vec![id.to_string()];

        {
            let mut get_children_stmt = tx.prepare("SELECT id FROM vault_items WHERE parent_id = ?1")?;
            while let Some(current_id) = queue.pop() {
                let children_ids: Vec<String> = get_children_stmt
                    .query_map(params![&current_id], |row| row.get(0))?
                    .collect::<RusqliteResult<_>>()?;

                queue.extend(children_ids);
                ids_to_delete.push(current_id);
            }
        }

        if ids_to_delete.is_empty() {
            tx.commit()?;
            return Ok(());
        }

        let data_paths: Vec<String> = {
            let placeholders = ids_to_delete.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!("SELECT * FROM vault_items WHERE id IN ({})", placeholders);
            let params_from_ids = rusqlite::params_from_iter(ids_to_delete.iter());

            let mut stmt = tx.prepare(&sql)?;
            let item_iter = stmt.query_map(params_from_ids, |row| Self::row_to_vault_item(row, crypto))?;
            
            item_iter
                .filter_map(|item_result| item_result.ok())
                .map(|item| item.data_path)
                .filter(|path| !path.is_empty())
                .collect()
        };

        {
            let placeholders = ids_to_delete.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!("DELETE FROM vault_items WHERE id IN ({})", placeholders);
            let params_from_ids = rusqlite::params_from_iter(ids_to_delete.iter());
            tx.execute(&sql, params_from_ids)?;
        }

        tx.commit()?;

        let data_dir = self.vault_path.join("data");
        for path in data_paths {
            if path.is_empty() { continue; }
            let file_path = data_dir.join(path);
            if file_path.exists() {
                // Security: Use enhanced secure shredding
                if let Err(e) = Self::secure_shred_file(&file_path) {
                    error!("Failed to securely shred file {}: {}", file_path.display(), e);
                    // Fallback to basic shredding
                    if let Err(e2) = Self::write_shred_pattern(&file_path, 0x00) {
                        error!("Failed fallback shred {}: {}", file_path.display(), e2);
                    }
                }
                if let Err(e) = fs::remove_file(&file_path) {
                    error!("Failed to delete file {}: {}", file_path.display(), e);
                }
            }
        }

        Ok(())
    }

    pub fn restore_item(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let changes = conn.execute(
            "UPDATE vault_items SET deleted_at = NULL WHERE id = ?1",
            params![id],
        )?;
        Ok(changes > 0)
    }

    pub fn permanently_delete_all_deleted_items(&self, crypto: &Crypto) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        // Get all deleted items
        let deleted_items: Vec<(String, Vec<u8>)> = {
            let mut stmt = tx.prepare("SELECT id, data_path FROM vault_items WHERE deleted_at IS NOT NULL")?;
            let rows = stmt.query_map([], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })?;
            rows.collect::<RusqliteResult<_>>()?
        }; // stmt is dropped here

        if deleted_items.is_empty() {
            tx.commit()?;
            return Ok(());
        }

        // Delete all data files
        for (_, encrypted_data_path) in &deleted_items {
            if let Ok(data_path_bytes) = crypto.decrypt(encrypted_data_path) {
                if let Ok(data_path) = String::from_utf8(data_path_bytes) {
                    let file_path = self.vault_path.join("data").join(&data_path);
                    if file_path.exists() {
                        if let Err(e) = fs::remove_file(&file_path) {
                            warn!("Failed to delete data file {}: {}", file_path.display(), e);
                        }
                    }
                }
            }
        }

        // Delete all database records
        tx.execute("DELETE FROM vault_items WHERE deleted_at IS NOT NULL", [])?;
        tx.commit()?;
        Ok(())
    }

    pub fn restore_item_to_root(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let changes = conn.execute(
            "UPDATE vault_items SET deleted_at = NULL, parent_id = NULL WHERE id = ?1",
            params![id],
        )?;
        Ok(changes > 0)
    }

    pub fn restore_item_and_descendants(&self, id: &str, _crypto: &Crypto) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let mut ids_to_restore = Vec::new();
        let mut queue = vec![id.to_string()];

        {
            let mut get_children_stmt = tx.prepare("SELECT id FROM vault_items WHERE parent_id = ?1")?;
            while let Some(current_id) = queue.pop() {
                let children_ids: Vec<String> = get_children_stmt
                    .query_map(params![&current_id], |row| row.get(0))?
                    .collect::<RusqliteResult<_>>()?;

                queue.extend(children_ids);
                ids_to_restore.push(current_id);
            }
        }

        if ids_to_restore.is_empty() {
            tx.commit()?;
            return Ok(());
        }

        {
            let placeholders = ids_to_restore.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!("UPDATE vault_items SET deleted_at = NULL WHERE id IN ({})", placeholders);
            let params_from_ids = rusqlite::params_from_iter(ids_to_restore.iter());
            tx.execute(&sql, params_from_ids)?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn is_initialized(&self) -> bool {
        self.vault_path.join("salt").exists() && self.vault_path.join("verify").exists()
    }

    pub fn get_salt(&self) -> Result<Vec<u8>> {
        fs::read(self.vault_path.join("salt")).map_err(Error::from)
    }

    pub fn get_verification_token(&self) -> Result<Vec<u8>> {
        fs::read(self.vault_path.join("verify")).map_err(Error::from)
    }

    pub fn store_verification_token(&self, token: &[u8]) -> Result<()> {
        fs::write(self.vault_path.join("verify"), token).map_err(Error::from)
    }

    pub fn update_salt(&self, new_salt: &[u8]) -> Result<()> {
        fs::write(self.vault_path.join("salt"), new_salt).map_err(Error::from)
    }

    fn get_meta_value(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM vault_meta WHERE key = ?1")?;
        let value: RusqliteResult<String> = stmt.query_row(params![key], |row| row.get(0));
        Ok(value.ok())
    }

    fn set_meta_value(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO vault_meta (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn initialize(&self, salt: &[u8], strength: KeyDerivationStrength) -> Result<()> {
        fs::write(self.vault_path.join("salt"), salt)?;
        self.set_key_derivation_strength(strength)?;
        self.set_brute_force_config(BruteForceConfig::default())?;
        self.set_failed_login_attempts(0)?;
        self.set_last_failed_attempt_timestamp(None)?;
        Ok(())
    }

    pub fn get_key_derivation_strength(&self) -> Result<KeyDerivationStrength> {
        let strength_str = self.get_meta_value("kdf_strength")?;
        
        Ok(match strength_str.as_deref() {
            Some("Fast") => KeyDerivationStrength::Fast,
            Some("Paranoid") => KeyDerivationStrength::Paranoid,
            _ => KeyDerivationStrength::Recommended,
        })
    }

    pub fn set_key_derivation_strength(&self, strength: KeyDerivationStrength) -> Result<()> {
        let strength_str = match strength {
            KeyDerivationStrength::Fast => "Fast",
            KeyDerivationStrength::Recommended => "Recommended",
            KeyDerivationStrength::Paranoid => "Paranoid",
        };
        self.set_meta_value("kdf_strength", strength_str)?;
        Ok(())
    }

    pub fn get_brute_force_config(&self) -> Result<BruteForceConfig> {
        let config_json = self.get_meta_value("brute_force_config")?;
        if let Some(json) = config_json {
            serde_json::from_str(&json).map_err(|e| Error::Storage(format!("Failed to parse brute force config: {}", e)))
        } else {
            Ok(BruteForceConfig::default())
        }
    }

    pub fn set_brute_force_config(&self, config: BruteForceConfig) -> Result<()> {
        let config_json = serde_json::to_string(&config)?;
        self.set_meta_value("brute_force_config", &config_json)?;
        Ok(())
    }

    pub fn get_failed_login_attempts(&self) -> Result<u32> {
        let attempts_str = self.get_meta_value("failed_login_attempts")?;
        attempts_str.unwrap_or_else(|| "0".to_string()).parse().map_err(|e| Error::Storage(format!("Failed to parse failed login attempts: {}", e)))
    }

    pub fn set_failed_login_attempts(&self, attempts: u32) -> Result<()> {
        self.set_meta_value("failed_login_attempts", &attempts.to_string())?;
        Ok(())
    }

    pub fn get_last_failed_attempt_timestamp(&self) -> Result<Option<DateTime<Utc>>> {
        let timestamp_str = self.get_meta_value("last_failed_attempt_timestamp")?;
        if let Some(ts_str) = timestamp_str {
            if ts_str.is_empty() {
                Ok(None)
            } else {
                ts_str.parse().map(Some).map_err(|e| Error::Storage(format!("Failed to parse timestamp: {}", e)))
            }
        } else {
            Ok(None)
        }
    }

    pub fn set_last_failed_attempt_timestamp(&self, timestamp: Option<DateTime<Utc>>) -> Result<()> {
        let ts_str = timestamp.map(|ts| ts.to_rfc3339()).unwrap_or_default();
        self.set_meta_value("last_failed_attempt_timestamp", &ts_str)?;
        Ok(())
    }

    pub fn get_theme(&self) -> Result<String> {
        let theme = self.get_meta_value("theme")?;
        Ok(theme.unwrap_or_else(|| "dark".to_string()))
    }

    pub fn set_theme(&self, theme: &str) -> Result<()> {
        self.set_meta_value("theme", theme)?;
        Ok(())
    }

    pub fn write_encrypted_file(&self, data: &[u8], file_name: &str) -> Result<()> {
        let file_path = self.vault_path.join("data").join(file_name);
        trace!("Writing encrypted file to: {}", file_path.display());
        fs::write(file_path, data).map_err(Error::from)
    }

    pub fn read_encrypted_file(&self, file_name: &str, crypto: &Crypto) -> Result<Vec<u8>> {
        let file_path = self.vault_path.join("data").join(file_name);
        trace!("Attempting to read encrypted file from: {}", file_path.display());
        
        // check if file exists
        if !file_path.exists() {
            error!("File does not exist: {}", file_path.display());
            return Err(Error::Storage(format!("File not found: {}", file_path.display())));
        }
        
        // check file permissions
        match fs::metadata(&file_path) {
            Ok(metadata) => {
                debug!("File metadata - size: {} bytes, readable: {}", 
                    metadata.len(), 
                    metadata.permissions().readonly());
            }
            Err(e) => {
                error!("Failed to get file metadata for {}: {}", file_path.display(), e);
                return Err(Error::Storage(format!("Cannot access file metadata: {}", e)));
            }
        }
        
        let encrypted_data = match fs::read(&file_path) {
            Ok(data) => {
                debug!("Successfully read {} bytes from encrypted file: {}", data.len(), file_path.display());
                data
            }
            Err(e) => {
                error!("Failed to read file {}: {}", file_path.display(), e);
                return Err(Error::Storage(format!("Failed to read file: {}", e)));
            }
        };
        
        match crypto.decrypt(&encrypted_data) {
            Ok(decrypted) => {
                debug!("Successfully decrypted {} bytes", decrypted.len());
                Ok(decrypted)
            }
            Err(e) => {
                error!("Failed to decrypt file {}: {}", file_path.display(), e);
                Err(e)
            }
        }
    }

    pub fn get_vault_path(&self) -> &PathBuf {
        &self.vault_path
    }

    pub fn reset(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        
        // clear all tables (eat shit data)
        conn.execute("DELETE FROM vault_items", [])?;
        conn.execute("DELETE FROM vault_meta", [])?;
        
        // reset the database to initial state (fresh start!)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vault_items (
                id TEXT PRIMARY KEY,
                parent_id TEXT,
                name BLOB NOT NULL,
                item_type BLOB NOT NULL,
                data_path BLOB NOT NULL,
                folder_type BLOB,
                tags BLOB,
                created_at BLOB NOT NULL,
                updated_at BLOB NOT NULL,
                deleted_at BLOB,
                totp_secret BLOB
            )",
            [],
        )?;
        
        // migration: add deleted_at and totp_secret columns if they don't exist
        let mut stmt = conn.prepare("PRAGMA table_info(vault_items)")?;
        let column_names_map = stmt.query_map([], |row| row.get::<_, String>(1))?;
        let columns: Vec<String> = column_names_map.collect::<RusqliteResult<Vec<String>>>().map_err(Error::from)?;

        if !columns.contains(&"deleted_at".to_string()) {
            info!("Migrating database (reset): Adding deleted_at column to vault_items");
            conn.execute("ALTER TABLE vault_items ADD COLUMN deleted_at BLOB", [])?;
        }
        if !columns.contains(&"totp_secret".to_string()) {
            info!("Migrating database (reset): Adding totp_secret column to vault_items");
            conn.execute("ALTER TABLE vault_items ADD COLUMN totp_secret BLOB", [])?;
        }


        conn.execute(
            "CREATE TABLE IF NOT EXISTS vault_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        // clear the data directory (nuke those files!)
        let data_dir = self.vault_path.join("data");
        if data_dir.exists() {
            fs::remove_dir_all(&data_dir)?;
        }
        fs::create_dir_all(&data_dir)?;

        // delete salt and verify files to mark vault as uninitialized (no more secrets!)
        let salt_file = self.vault_path.join("salt");
        let verify_file = self.vault_path.join("verify");
        
        if salt_file.exists() {
            fs::remove_file(&salt_file)?;
        }
        if verify_file.exists() {
            fs::remove_file(&verify_file)?;
        }

        Ok(())
    }

    pub fn rename_tag_in_all_items(&self, old_tag: &str, new_tag: &str, crypto: &Crypto) -> Result<()> {
        info!("Attempting to rename tag: '{}' to '{}'", old_tag, new_tag);
        let mut items = self.get_all_items_recursive(crypto)?;
        info!("Found {} items. Processing tags...", items.len());
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let mut changes_made = 0;
        for item in &mut items {
            let mut updated = false;
            let mut new_tags: Vec<String> = Vec::new();
            for tag in &item.tags {
                if tag == old_tag {
                    if !new_tags.contains(&new_tag.to_string()) {
                        new_tags.push(new_tag.to_string());
                        updated = true;
                    }
                } else {
                    new_tags.push(tag.clone());
                }
            }
            if updated {
                item.tags = new_tags;
                item.updated_at = Utc::now();
                self.update_item_fields_in_transaction(item, crypto, &tx)?;
                changes_made += 1;
                info!("Updated tags for item ID: {}", item.id);
            }
        }
        tx.commit()?;
        info!("Transaction committed for rename_tag. Total items with tags renamed: {}", changes_made);
        Ok(())
    }

    pub fn remove_tag_from_all_items(&self, tag_to_remove: &str, crypto: &Crypto) -> Result<()> {
        info!("Attempting to delete tag: '{}'", tag_to_remove);
        let mut items = self.get_all_items_recursive(crypto)?;
        info!("Found {} items. Processing tags...", items.len());
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let mut changes_made = 0;
        for item in &mut items {
            let original_tag_count = item.tags.len();
            item.tags.retain(|tag| tag != tag_to_remove);
            if item.tags.len() != original_tag_count {
                item.updated_at = Utc::now();
                self.update_item_fields_in_transaction(item, crypto, &tx)?;
                changes_made += 1;
                info!("Removed tag from item ID: {}", item.id);
            }
        }
        tx.commit()?;
        info!("Transaction committed for delete_tag. Total items with tag removed: {}", changes_made);
        Ok(())
    }

    fn update_item_fields_in_transaction(&self, item: &VaultItem, crypto: &Crypto, tx: &rusqlite::Transaction) -> Result<()> {
        let tags_json = serde_json::to_string(&item.tags)?;

        let encrypted_name = crypto.encrypt(item.name.as_bytes())?;
        let encrypted_item_type = crypto.encrypt(item.item_type.as_bytes())?;
        let encrypted_data_path = crypto.encrypt(item.data_path.as_bytes())?;
        let encrypted_tags = crypto.encrypt(tags_json.as_bytes())?;
        let encrypted_folder_type = match &item.folder_type {
            Some(ft) => Some(crypto.encrypt(ft.as_bytes())?),
            None => None,
        };
        let encrypted_created_at = crypto.encrypt(item.created_at.to_rfc3339().as_bytes())?;
        let encrypted_updated_at = crypto.encrypt(item.updated_at.to_rfc3339().as_bytes())?;
        let encrypted_deleted_at = match &item.deleted_at {
            Some(dt) => Some(crypto.encrypt(dt.to_rfc3339().as_bytes())?),
            None => None,
        };
        let encrypted_totp_secret = match &item.totp_secret {
            Some(secret) => Some(crypto.encrypt(secret.as_bytes())?),
            None => None,
        };
        
        tx.execute(
            "UPDATE vault_items SET parent_id = ?2, name = ?3, item_type = ?4, data_path = ?5, folder_type = ?6, tags = ?7, created_at = ?8, updated_at = ?9, deleted_at = ?10, totp_secret = ?11 WHERE id = ?1",
            params![
                item.id,
                item.parent_id,
                encrypted_name,
                encrypted_item_type,
                encrypted_data_path,
                encrypted_folder_type,
                encrypted_tags,
                encrypted_created_at,
                encrypted_updated_at,
                encrypted_deleted_at,
                encrypted_totp_secret,
            ],
        )?;

        Ok(())
    }
}