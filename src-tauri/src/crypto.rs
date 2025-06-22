use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use argon2::{
    password_hash::{SaltString},
    Argon2, Params, ParamsBuilder,
};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

use crate::error::Error;
use crate::Result;

const SALT_LENGTH: usize = 16;
const NONCE_LENGTH: usize = 12;
const TOKEN_LENGTH: usize = 32;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, Default, PartialEq, Eq)]
pub enum KeyDerivationStrength {
    Fast,
    #[default]
    Recommended,
    Paranoid,
}

impl KeyDerivationStrength {
    fn get_params(&self) -> Result<Params> {
        let mut params = ParamsBuilder::new();
        let builder = match self {
            KeyDerivationStrength::Fast => params.m_cost(256 * 1024).t_cost(2).p_cost(2), // increased from 32mb to 256mb
            KeyDerivationStrength::Recommended => params.m_cost(512 * 1024).t_cost(3).p_cost(4), // increased from 64mb to 512mb
            KeyDerivationStrength::Paranoid => params.m_cost(1024 * 1024).t_cost(4).p_cost(4), // increased from 128mb to 1gb
        };

        builder
            .output_len(32)
            .build()
            .map_err(|e| Error::KeyDerivation(e.to_string()))
    }
}

pub struct Crypto {
    cipher: Option<Aes256Gcm>,
}

impl Zeroize for Crypto {
    fn zeroize(&mut self) {
        self.cipher = None;
    }
}

impl Drop for Crypto {
    fn drop(&mut self) {
        self.zeroize();
    }
}

impl Crypto {
    pub fn new() -> Self {
        Self { cipher: None }
    }

    pub fn is_unlocked(&self) -> bool {
        self.cipher.is_some()
    }

    pub fn derive_key(
        &self,
        password: &str,
        salt: &[u8],
        strength: KeyDerivationStrength,
    ) -> Result<Vec<u8>> {
        let salt = SaltString::encode_b64(salt).map_err(|e| Error::KeyDerivation(e.to_string()))?;
        let params = strength.get_params()?;
        let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);

        let mut output_key_material = vec![0u8; 32];
        argon2
            .hash_password_into(
                password.as_bytes(),
                salt.as_str().as_bytes(),
                &mut output_key_material,
            )
            .map_err(|e| Error::KeyDerivation(e.to_string()))?;

        Ok(output_key_material)
    }

    pub fn unlock(&mut self, key: &[u8]) -> Result<()> {
        let key = Key::<Aes256Gcm>::from_slice(key);
        self.cipher = Some(Aes256Gcm::new(key));
        Ok(())
    }

    pub fn lock(&mut self) {
        self.zeroize();
    }

    pub fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>> {
        let cipher = self.cipher.as_ref().ok_or(Error::VaultLocked)?;
        
        let mut nonce = vec![0u8; NONCE_LENGTH];
        OsRng.fill_bytes(&mut nonce);
        let nonce = Nonce::from_slice(&nonce);

        let ciphertext = cipher
            .encrypt(nonce, data)
            .map_err(|e| Error::Encryption(e.to_string()))?;

        let mut result = Vec::with_capacity(NONCE_LENGTH + ciphertext.len());
        result.extend_from_slice(nonce);
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    pub fn decrypt(&self, encrypted_data: &[u8]) -> Result<Vec<u8>> {
        let cipher = self.cipher.as_ref().ok_or(Error::VaultLocked)?;

        if encrypted_data.len() < NONCE_LENGTH {
            return Err(Error::Decryption("Invalid encrypted data length".into()));
        }

        let (nonce, ciphertext) = encrypted_data.split_at(NONCE_LENGTH);
        let nonce = Nonce::from_slice(nonce);

        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| Error::Decryption(e.to_string()))?;

        Ok(plaintext)
    }

    pub fn generate_salt() -> Vec<u8> {
        let mut salt = vec![0u8; SALT_LENGTH];
        OsRng.fill_bytes(&mut salt);
        salt
    }
    
    pub fn generate_verification_token() -> Vec<u8> {
        let mut token = vec![0u8; TOKEN_LENGTH];
        OsRng.fill_bytes(&mut token);
        token
    }
}