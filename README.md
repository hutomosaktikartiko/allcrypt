# AllCrypt - Client-side File Encryption

A **100% client-side file encryption tool** built with **Rust compiled to WebAssembly**, running entirely in the browser. No backend. No upload. No server-side processing.

> **File size is limited by your device, not our server.**

---

## Project Architecture

```text
allcrypt/
│
├─ README.md
├─ package.json
├─ bun.lockb
├─ tsconfig.json
├─ vite.config.ts
├─ tailwind.config.ts
├─ postcss.config.js
│
├─ public/
│   └─ favicon.svg
│
├─ src/
│   ├─ main.tsx
│   ├─ App.tsx
│   ├─ index.css
│   │
│   ├─ components/
│   │   ├─ FilePicker.tsx
│   │   ├─ PasswordInput.tsx
│   │   ├─ ProgressBar.tsx
│   │   ├─ ActionButtons.tsx
│   │   └─ ErrorBanner.tsx
│   │
│   ├─ pages/
│   │   └─ Home.tsx
│   │
│   ├─ hooks/
│   │   ├─ useEncryptionWorker.ts
│   │   └─ usePasswordGenerator.ts
│   │
│   ├─ worker/
│   │   ├─ crypto.worker.ts
│   │   ├─ messages.ts
│   │   └─ types.ts
│   │
│   ├─ wasm/
│   │   └─ crypto_wasm.ts
│   │
│   ├─ utils/
│   │   ├─ download.ts
│   │   ├─ file.ts
│   │   └─ constants.ts
│   │
│   └─ types/
│       └─ index.ts
│
├─ rust/
│   ├─ Cargo.toml
│   ├─ Cargo.lock
│   └─ src/
│       ├─ lib.rs
│       ├─ crypto/
│       │   ├─ mod.rs
│       │   ├─ kdf.rs
│       │   ├─ encrypt.rs
│       │   └─ decrypt.rs
│       │
│       ├─ format/
│       │   ├─ mod.rs
│       │   └─ header.rs
│       │
│       └─ utils/
│           └─ buffer.rs
│
└─ scripts/
    └─ build-wasm.sh

```

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

- [x] Argon2id key derivation
- [x] AES-256-GCM encryption
- [x] Chunk-based encryption
- [x] Authentication tag validation
- [x] Wrong-password detection
- [x] Corrupted-file detection

### Web Worker

- [x] Worker setup
- [x] WASM loading inside worker
- [x] Main thread ↔ Worker messaging
- [x] Progress reporting
- [x] Auto-cancel on reload / close

### UI/UX

- [ ] File picker
- [ ] Password strength indicator
- [ ] Progress bar
- [ ] Error messages (wrong password, invalid file)
- [ ] Clear warnings for large files

### Build & Deploy

- [x] Vite + WASM integration
- [x] Bun-based local dev
- [ ] Production build
- [ ] Deploy to Cloudflare Pages
