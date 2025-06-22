use serde::Serialize;
use std::io;
use std::fmt;
use std::error::Error as StdError;
use zip::result::ZipError;

#[derive(Debug, thiserror::Error, Serialize)]
pub enum Error {
    #[error("IO error: {0}")]
    Io(String),

    #[error("Crypto error: {0}")]
    Crypto(String),

    #[error("Storage error: {0}")]
    Storage(String),
    
    #[error("Zip error: {0}")]
    Zip(String),

    #[error("CSV error: {0}")]
    Csv(String),

    #[error("Invalid key")]
    InvalidKey,

    #[error("Item not found: {0}")]
    ItemNotFound(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Key derivation error: {0}")]
    KeyDerivation(String),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Decryption error: {0}")]
    Decryption(String),

    #[error("Vault is locked")]
    VaultLocked,

    #[error("Invalid master key")]
    InvalidMasterKey,

    #[error("Vault is already initialized")]
    VaultAlreadyInitialized,

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Tauri error: {0}")]
    TauriError(String),
}

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Serialize)]
pub struct IoErrorWrapper(String);

impl fmt::Display for IoErrorWrapper {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "IO error: {}", self.0)
    }
}

impl StdError for IoErrorWrapper {}

impl From<io::Error> for Error {
    fn from(err: io::Error) -> Self {
        Error::Io(err.to_string())
    }
}

impl From<rusqlite::Error> for Error {
    fn from(err: rusqlite::Error) -> Self {
        match err {
            rusqlite::Error::QueryReturnedNoRows => Error::ItemNotFound("query returned no rows".to_string()),
            rusqlite::Error::SqliteFailure(ffi_err, msg_opt) => {
                // applied compiler's suggestion to wrap ffi_err.code in some() (compiler knows best)
                let actual_code_option: Option<rusqlite::ErrorCode> = Some(ffi_err.code); 
                match actual_code_option {
                    Some(rusqlite::ErrorCode::ConstraintViolation) => {
                        Error::Storage(format!("Database constraint violation: {}", msg_opt.unwrap_or_default()))
                    },
                    _ => Error::Storage(format!("Database error: {}", msg_opt.unwrap_or_default()))
                }
            },
            _ => Error::Storage(err.to_string()),
        }
    }
}

impl From<serde_json::Error> for Error {
    fn from(err: serde_json::Error) -> Self {
        Error::Serialization(err.to_string())
    }
}

impl From<tauri::Error> for Error {
    fn from(err: tauri::Error) -> Self {
        Error::TauriError(err.to_string())
    }
}

impl From<ZipError> for Error {
    fn from(err: ZipError) -> Self {
        Error::Zip(err.to_string())
    }
}

impl From<csv::Error> for Error {
    fn from(err: csv::Error) -> Self {
        Error::Csv(err.to_string())
    }
}