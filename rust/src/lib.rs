use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::Argon2;
use rand::rngs::OsRng;
use rand::RngCore;
use wasm_bindgen::prelude::*;

use crate::crypto::{decrypt::decrypt_file_bytes, encrypt::encrypt_file_bytes};

mod crypto;
mod format;

#[wasm_bindgen]
pub fn add(left: i32, right: i32) -> i32 {
    left + right
}

#[wasm_bindgen]
pub fn reverse(input: &str) -> String {
    input.chars().rev().collect()
}

#[wasm_bindgen]
pub fn invert_bytes(input: Vec<u8>) -> Vec<u8> {
    input.into_iter().map(|b| 255 - b).collect()
}

#[wasm_bindgen]
pub fn identify(input: Vec<u8>) -> Vec<u8> {
    input
}

#[wasm_bindgen]
pub fn encrypt_string(password: &str, plaintext: &str) -> Vec<u8> {
    // Generate RAW salt (16 bytes)
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);

    // Derive key
    let argon2 = Argon2::default();
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), &salt, &mut key)
        .expect("argon2 failed");

    // Create cipher
    let cipher = Aes256Gcm::new_from_slice(&key).unwrap();

    // Generate nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .expect("encryption failed");

    // Output format: [ salt(16) | nonce(12) | cihpertext ]
    let mut output = Vec::new();
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    output
}

#[wasm_bindgen]
pub fn decrypt_string(password: &str, encrypted: Vec<u8>) -> Result<String, JsValue> {
    // Parse input
    let salt_len = 16;
    let nonce_len = 12;

    if encrypted.len() < salt_len + nonce_len {
        return Err(JsValue::from_str("Invalid encrypted data"));
    }

    // Parse header
    let salt = &encrypted[..salt_len];
    let nonce_bytes = &encrypted[salt_len..salt_len + nonce_len];
    let ciphertext = &encrypted[salt_len + nonce_len..];

    // Derive key
    let argon2 = Argon2::default();
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|_| JsValue::from_str("Wrong password"))?;

    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|_| JsValue::from_str("Cipher init failed"))?;

    // Decrypt
    let plaintext = cipher
        .decrypt(Nonce::from_slice(nonce_bytes), ciphertext)
        .map_err(|_| JsValue::from_str("Decryption failed"))?;

    String::from_utf8(plaintext).map_err(|_| JsValue::from_str("Invalid UTF-8"))
}

#[wasm_bindgen]
pub fn encrypt_file(password: &str, file_bytes: Vec<u8>, chunk_exp: u8) -> Vec<u8> {
    encrypt_file_bytes(password, &file_bytes, chunk_exp)
}

#[wasm_bindgen]
pub fn decrypt_file(password: &str, encrypted_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
    decrypt_file_bytes(password, &encrypted_bytes).map_err(|e| JsValue::from_str(e))
}
