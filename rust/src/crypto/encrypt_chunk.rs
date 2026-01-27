use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};

pub fn encrypt_chunk(
    key: &[u8; 32],
    base_nonce: &[u8; 12],
    chunk_index: u32,
    chunk: &[u8],
) -> Vec<u8> {
    let cipher = Aes256Gcm::new_from_slice(key).unwrap();

    let mut nonce = *base_nonce;
    nonce[8..12].copy_from_slice(&chunk_index.to_le_bytes());

    cipher
        .encrypt(Nonce::from_slice(&nonce), chunk)
        .expect("chunk encryption failed")
}
