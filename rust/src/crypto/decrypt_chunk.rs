use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};

pub fn decrypt_chunk(
    key: &[u8; 32],
    base_nonce: &[u8; 12],
    chunk_index: u32,
    encrypted_chunk: &[u8],
) -> Result<Vec<u8>, &'static str> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| "Cipher init failed")?;

    let mut nonce = *base_nonce;
    nonce[8..12].copy_from_slice(&chunk_index.to_le_bytes());

    cipher
        .decrypt(Nonce::from_slice(&nonce), encrypted_chunk)
        .map_err(|_| "Decryption failed")
}
