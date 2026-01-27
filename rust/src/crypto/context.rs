use argon2::Argon2;
use rand::rngs::OsRng;
use rand::RngCore;

use crate::format::header::{FileHeader, CIPHER_AES_256_GCM, KDF_ARGON2ID, VERSION};

pub struct EncryptionContext {
    pub key: [u8; 32],
    pub base_nonce: [u8; 12],
    pub header: FileHeader,
}

pub fn init_encryption(password: &str, file_size: u64, chunk_exp: u8) -> EncryptionContext {
    // Salt
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);

    // Key
    let argon2 = Argon2::default();
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), &salt, &mut key)
        .expect("argon2 failed");

    // Base nonce
    let mut base_nonce = [0u8; 12];
    OsRng.fill_bytes(&mut base_nonce);

    let header = FileHeader {
        version: VERSION,
        kdf: KDF_ARGON2ID,
        cipher: CIPHER_AES_256_GCM,
        chunk_exp,
        salt,
        base_nonce,
        original_size: file_size,
    };

    EncryptionContext {
        key,
        base_nonce,
        header,
    }
}
