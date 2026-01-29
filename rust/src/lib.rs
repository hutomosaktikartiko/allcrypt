use argon2::Argon2;
use wasm_bindgen::prelude::*;
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::{
    crypto::{
        context::init_encryption, decrypt_chunk::decrypt_chunk, encrypt_chunk::encrypt_chunk,
    },
    format::header::FileHeader,
};

mod crypto;
mod format;

#[wasm_bindgen]
#[allow(dead_code)]
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct EncryptInitResult {
    header: Vec<u8>,
    key: Vec<u8>,
    base_nonce: Vec<u8>,
}

#[wasm_bindgen]
impl EncryptInitResult {
    #[wasm_bindgen(getter)]
    pub fn header(&self) -> Vec<u8> {
        self.header.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn key(&self) -> Vec<u8> {
        self.key.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn base_nonce(&self) -> Vec<u8> {
        self.base_nonce.clone()
    }

    pub fn clear(&mut self) {
        self.header.zeroize();
        self.key.zeroize();
        self.base_nonce.zeroize();
    }
}

#[wasm_bindgen]
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct DecodedHeader {
    chunk_exp: u8,
    salt: Vec<u8>,
    base_nonce: Vec<u8>,
    original_size: u64,
}

#[wasm_bindgen]
impl DecodedHeader {
    #[wasm_bindgen(getter)]
    pub fn chunk_exp(&self) -> u8 {
        self.chunk_exp
    }

    #[wasm_bindgen(getter)]
    pub fn salt(&self) -> Vec<u8> {
        self.salt.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn base_nonce(&self) -> Vec<u8> {
        self.base_nonce.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn original_size(&self) -> u64 {
        self.original_size
    }

    pub fn clear(&mut self) {
        self.chunk_exp.zeroize();
        self.salt.zeroize();
        self.base_nonce.zeroize();
        self.original_size.zeroize();
    }
}

#[wasm_bindgen]
pub fn init_encrypt(password: &str, file_size: u64, chunk_exp: u8) -> EncryptInitResult {
    let ctx = init_encryption(password, file_size, chunk_exp);

    EncryptInitResult {
        header: ctx.header.encode(),
        key: ctx.key.to_vec(),
        base_nonce: ctx.base_nonce.to_vec(),
    }
}

#[wasm_bindgen]
pub fn encrypt_chunk_wasm(
    key: Vec<u8>,
    base_nonce: Vec<u8>,
    chunk_index: u32,
    chunk: Vec<u8>,
) -> Vec<u8> {
    let key: [u8; 32] = key.try_into().unwrap();
    let base_nonce: [u8; 12] = base_nonce.try_into().unwrap();

    encrypt_chunk(&key, &base_nonce, chunk_index, &chunk)
}

#[wasm_bindgen]
pub fn decode_header_wasm(header_bytes: Vec<u8>) -> Result<DecodedHeader, JsValue> {
    let header =
        FileHeader::decode(&header_bytes).map_err(|_| JsValue::from_str("Invalid header"))?;

    Ok(DecodedHeader {
        chunk_exp: header.chunk_exp,
        salt: header.salt.to_vec(),
        base_nonce: header.base_nonce.to_vec(),
        original_size: header.original_size,
    })
}

#[wasm_bindgen]
pub fn derive_key_wasm(password: &str, salt: Vec<u8>) -> Result<Vec<u8>, JsValue> {
    if salt.len() != 16 {
        return Err(JsValue::from_str("Invalid salt length"));
    }

    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), &salt, &mut key)
        .map_err(|_| JsValue::from_str("Key derivation failed"))?;

    let result = key.to_vec();
    key.zeroize();
    Ok(result)
}

#[wasm_bindgen]
pub fn decrypt_chunk_wasm(
    key: Vec<u8>,
    base_nonce: Vec<u8>,
    chunk_index: u32,
    encrypted_chunk: Vec<u8>,
) -> Result<Vec<u8>, JsValue> {
    let key: [u8; 32] = key.try_into().map_err(|_| JsValue::from_str("Bad key"))?;
    let base_nonce: [u8; 12] = base_nonce
        .try_into()
        .map_err(|_| JsValue::from_str("Bad nonce"))?;

    decrypt_chunk(&key, &base_nonce, chunk_index, &encrypted_chunk)
        .map_err(|e| JsValue::from_str(e))
}
