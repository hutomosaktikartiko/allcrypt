use std::convert::TryInto;

const MAGIC: &[u8; 4] = b"ACRY";
pub const VERSION: u8 = 0x01;

pub const KDF_ARGON2ID: u8 = 0x01;
pub const CIPHER_AES_256_GCM: u8 = 0x01;

pub const HEADER_SIZE: usize = 44;

#[derive(Debug)]
pub enum HeaderError {
    InvalidMagic,
    #[allow(dead_code)] // Versi disimpan untuk debugging/error reporting
    UnsupportedVersion(u8),
    InvalidLength,
}

#[derive(Debug)]
pub struct FileHeader {
    pub version: u8,
    pub kdf: u8,
    pub cipher: u8,
    pub chunk_exp: u8,
    pub salt: [u8; 16],
    pub base_nonce: [u8; 12],
    pub original_size: u64,
}

impl FileHeader {
    pub fn encode(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(HEADER_SIZE);

        // Magic
        buf.extend_from_slice(MAGIC);

        // Version & algorithms
        buf.push(self.version);
        buf.push(self.kdf);
        buf.push(self.cipher);
        buf.push(self.chunk_exp);

        // Salt & nonce
        buf.extend_from_slice(&self.salt);
        buf.extend_from_slice(&self.base_nonce);

        // Original file size (little-endian)
        buf.extend_from_slice(&self.original_size.to_le_bytes());

        buf
    }

    pub fn decode(data: &[u8]) -> Result<Self, HeaderError> {
        if data.len() < HEADER_SIZE {
            return Err(HeaderError::InvalidLength);
        }

        // Magic check
        if &data[0..4] != MAGIC {
            return Err(HeaderError::InvalidMagic);
        }

        let version = data[4];
        if version != VERSION {
            return Err(HeaderError::UnsupportedVersion(version));
        }

        let kdf = data[5];
        let cipher = data[6];
        let chunk_exp = data[7];

        let salt: [u8; 16] = data[8..24].try_into().unwrap();
        let base_nonce: [u8; 12] = data[24..36].try_into().unwrap();

        let original_size = u64::from_le_bytes(data[36..44].try_into().unwrap());

        Ok(FileHeader {
            version,
            kdf,
            cipher,
            chunk_exp,
            salt,
            base_nonce,
            original_size,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::FileHeader;

    #[test]
    pub fn test_header_roundtrip() {
        let header = FileHeader {
            version: 0x01,
            kdf: 0x01,
            cipher: 0x01,
            chunk_exp: 20,
            salt: [1u8; 16],
            base_nonce: [2u8; 12],
            original_size: 123456,
        };

        let encoded = header.encode();
        let decoded = FileHeader::decode(&encoded).unwrap();

        assert_eq!(decoded.original_size, 123456);
    }
}
