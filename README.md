# Client-side File Encryption

A **100% client-side file encryption tool** built with **Rust compiled to WebAssembly**, running entirely in the browser. No backend. No upload. No server-side processing.

> **File size is limited by your device, not our server.**

---

## Key Features

- Encrypt files **locally in the browser**
- Decrypt encrypted files locally
- Password-based encryption
- Supports large files (GB-scale, device-dependent)
- Smooth UI using Web Worker (non-blocking)
- Fully static deployment

---

## Tech Stack

### Core

- **Rust**: Cryptographic cire
- **WebAssembly (WASN)**: Browser runtime
- **Argon2id**: Password-based key derivation
- **AES-256-GCM**: Authenticated encryption

### Frontend

- **React**: UI framework
- **Vite**: Build tool
- **Tailwind CSS**: Styling

### Tooling

- **Bun**: Package manager
- **Web Worker**: Background processing

### Deployment

- **Cloudflare Pages**: Static site hosting

---

## How It Works

```text
User selects file
  ↓
User enters or generates password
  ↓
Web Worker loads Rust WASM
  ↓
File is read in chunks (1 MB)
  ↓
Each chunk is encrypted/decrypted
  ↓
Result is streamed and downloaded as single file
```

## Feature Checklist

### Core Functionality

- [ ] Select single file
- [ ] Input password
- [ ] Generate secure password (frontend)
- [ ] Encyrpt file
- [ ] Download encyrpted file (.enc)
- [ ] Decrypt encrypted file
- [ ] Download decrypted file

### Cryptography

- [ ] Argon2id key derivation
- [ ] AES-256-GCM encryption
- [ ] Chunk-based encryption
- [ ] Authentication tag validation
- [ ] Wrong-password detection
- [ ] Corrupted-file detection

### Web Worker

- [ ] Worker setup
- [ ] WASM loading inside worker
- [ ] Main thread ↔ Worker messaging
- [ ] Progress reporting
- [ ] Auto-cancel on reload / close

### UI/UX

- [ ] File picker
- [ ] Password strength indicator
- [ ] Progress bar
- [ ] Error messages (wrong password, invalid file)
- [ ] Clear warnings for large files

### Build & Deploy

- [ ] Vite + WASM integration
- [ ] Bun-based local dev
- [ ] Production build
- [ ] Deploy to Cloudflare Pages
- [ ] Domain setup (custom domain, SSL)
