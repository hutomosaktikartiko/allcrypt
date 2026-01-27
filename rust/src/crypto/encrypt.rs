use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::Argon2;
use rand::rngs::OsRng;
use rand::RngCore;

use crate::format::header::{FileHeader, CIPHER_AES_256_GCM, KDF_ARGON2ID, VERSION};

pub fn encrypt_file_bytes(password: &str, file_bytes: &[u8], chunk_exp: u8) -> Vec<u8> {
    let chunk_size = 1usize << chunk_exp;

    // Generate salt
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);

    // Derive key
    let argon2 = Argon2::default();
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), &salt, &mut key)
        .expect("argon2 failed");

    let cipher = Aes256Gcm::new_from_slice(&key).unwrap();

    // Base nonce
    let mut base_nonce = [0u8; 12];
    OsRng.fill_bytes(&mut base_nonce);

    // Build header
    let header = FileHeader {
        version: VERSION,
        kdf: KDF_ARGON2ID,
        cipher: CIPHER_AES_256_GCM,
        chunk_exp,
        salt,
        base_nonce,
        original_size: file_bytes.len() as u64,
    };

    let mut output = Vec::new();
    output.extend_from_slice(&header.encode());

    // 5. Encrypt chunks
    let mut chunk_index: u32 = 0;

    for chunk in file_bytes.chunks(chunk_size) {
        let mut nonce_bytes = base_nonce;
        nonce_bytes[8..12].copy_from_slice(&chunk_index.to_le_bytes());

        let nonce = Nonce::from_slice(&nonce_bytes);

        let encrypted_chunk = cipher.encrypt(nonce, chunk).expect("encryption failed");

        output.extend_from_slice(&encrypted_chunk);
        chunk_index += 1;
    }

    output
}
