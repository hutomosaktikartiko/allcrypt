use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::Argon2;

use crate::format::header::{FileHeader, HEADER_SIZE};

pub fn decrypt_file_bytes(password: &str, encrypted: &[u8]) -> Result<Vec<u8>, &'static str> {
    // Minimal length check
    if encrypted.len() < HEADER_SIZE {
        return Err("File too small");
    }

    // Decode header
    let header = FileHeader::decode(&encrypted[..HEADER_SIZE]).map_err(|_| "Invalid header")?;

    // Derive key
    let argon2 = Argon2::default();
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), &header.salt, &mut key)
        .map_err(|_| "Key derivation failed")?;

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|_| "Cipher init failed")?;

    // Prepare output buffer
    let chunk_size = 1usize << header.chunk_exp;
    let mut output = Vec::with_capacity(header.original_size as usize);

    // Decrypt chunks
    let mut offset = HEADER_SIZE;
    let mut chunk_index: u32 = 0;

    while offset < encrypted.len() {
        // Ciphertext size: plaintext chunk + auth tag (16)
        let remaining = encrypted.len() - offset;

        let encrypted_chunk_len = if remaining >= chunk_size + 16 {
            chunk_size + 16
        } else {
            remaining
        };

        let encrypted_chunk = &encrypted[offset..offset + encrypted_chunk_len];

        // Reconstruct nonce bytes
        let mut nonce_bytes = header.base_nonce;
        nonce_bytes[8..12].copy_from_slice(&chunk_index.to_le_bytes());
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Decrypt chunk
        let plaintext_chunk = cipher
            .decrypt(nonce, encrypted_chunk)
            .map_err(|_| "Decryption failed")?;

        output.extend_from_slice(&plaintext_chunk);

        offset += encrypted_chunk_len;
        chunk_index += 1;
    }

    // Trim to original size
    output.truncate(header.original_size as usize);

    Ok(output)
}
