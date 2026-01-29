import { createOPFSFile } from "../utils/opfs.js";
import init, {
  init_encrypt,
  encrypt_chunk_wasm,
  decrypt_chunk_wasm,
  decode_header_wasm,
  derive_key_wasm,
} from "../wasm/allcrypt_wasm.js";
import type { WorkerRequest, WorkerResponse } from "./types.js";

const HEADER_SIZE = 44;

let initialized = false;

function zeroBuffer(buffer: Uint8Array): void {
  buffer.fill(0);
}

function zeroBufferArray(buffers: Uint8Array[]): void {
  for (const buf of buffers) buf.fill(0);
  buffers.length = 0;
}

async function initWasm() {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

self.onmessage = async (e) => {
  const msg: WorkerRequest = e.data;
  console.log("Message received in worker:", msg);

  try {
    if (msg.type === "INIT") {
      await initWasm();
      self.postMessage({ type: "READY" });
      return;
    }

    if (!initialized) {
      self.postMessage({ type: "ERROR", message: "Worker not initialized" });
      return;
    }

    if (msg.type === "ENCRYPT_STREAM") {
      const { password, file, chunkExp, useOPFS, opfsFilename } = msg;

      const chunkSize = 1 << chunkExp;
      const initResult = init_encrypt(password, BigInt(file.size), chunkExp);

      if (useOPFS && opfsFilename) {
        const writable = await createOPFSFile(opfsFilename);

        // Write headers
        await writable.write(initResult.header as Uint8Array<ArrayBuffer>);
        let totalWritten = initResult.header.length;

        let offset = 0;
        let chunkIndex = 0;

        while (offset < file.size) {
          const slice = file.slice(offset, offset + chunkSize);
          const data = new Uint8Array(await slice.arrayBuffer());

          const encryptedChunk = encrypt_chunk_wasm(
            initResult.key,
            initResult.base_nonce,
            chunkIndex,
            data,
          );

          // Clear data buffer
          zeroBuffer(data);

          // Wite to OPFS
          await writable.write(encryptedChunk as Uint8Array<ArrayBuffer>);
          totalWritten += encryptedChunk.length;

          // Clear encrypted chunk buffer
          zeroBuffer(encryptedChunk);

          offset += data.length;
          chunkIndex++;

          self.postMessage({
            type: "PROGRESS",
            processed: offset,
            total: file.size,
          });
        }

        // Clear sensitive data
        initResult.clear();
        initResult.free();
        await writable.close();

        self.postMessage({ type: "DONE_OPFS", filename: opfsFilename, size: totalWritten });
      } else {
        const chunks: Uint8Array[] = [];
        chunks.push(initResult.header);

        let offset = 0;
        let chunkIndex = 0;

        while (offset < file.size) {
          const slice = file.slice(offset, offset + chunkSize);
          const data = new Uint8Array(await slice.arrayBuffer());

          const encryptedChunk = encrypt_chunk_wasm(
            initResult.key,
            initResult.base_nonce,
            chunkIndex,
            data,
          );

          // Clear data buffer
          zeroBuffer(data);

          offset += data.length;
          chunks.push(encryptedChunk);

          self.postMessage({
            type: "PROGRESS",
            processed: offset,
            total: file.size,
          });

          chunkIndex++;
        }

        // Clear sensitive data
        initResult.clear();
        initResult.free();

        // concat output
        const totalSize = chunks.reduce((s, c) => s + c.length, 0);
        const result = new Uint8Array(totalSize);
        let pos = 0;
        for (const c of chunks) {
          result.set(c, pos);
          pos += c.length;
        }
        
        // Clear chunk buffers
        zeroBufferArray(chunks);

        self.postMessage({ type: "DONE", result });
      }
    }

    if (msg.type === "DECRYPT_STREAM") {
      const { password, file, useOPFS, opfsFilename } = msg;

      // Read header
      const headerBuf = new Uint8Array(
        await file.slice(0, HEADER_SIZE).arrayBuffer(),
      );

      const header = decode_header_wasm(headerBuf);
      const chunkExp = header.chunk_exp;
      const chunkSize = 1 << chunkExp;

      // Derive key
      const key = derive_key_wasm(password, header.salt);
      const baseNonce = header.base_nonce;
      const originalSize = Number(header.original_size);

      if (useOPFS && opfsFilename) {
        const writable = await createOPFSFile(opfsFilename);

        let totalWritten = 0;

        let offset = HEADER_SIZE;
        let chunkIndex = 0;
        let produced = 0;

        while (offset < file.size) {
          const remaining = file.size - offset;
          const encLen = remaining >= chunkSize + 16 ? chunkSize + 16 : remaining;

          const encChunk = new Uint8Array(
            await file.slice(offset, offset + encLen).arrayBuffer(),
          );

          const decryptedChunk = decrypt_chunk_wasm(key, baseNonce, chunkIndex, encChunk);

          // Clear encChunk buffer
          zeroBuffer(encChunk);

          const isLastChunk = offset + encLen >= file.size;
          const chunkToWrite = isLastChunk && produced > originalSize
            ? decryptedChunk.subarray(0, originalSize - (produced - decryptedChunk.length))
            : decryptedChunk;

          // Write to OPFS
          await writable.write(chunkToWrite as Uint8Array<ArrayBuffer>);
          produced += decryptedChunk.length;
          totalWritten += decryptedChunk.length;

          // Clear decryptedChunk buffer
          zeroBuffer(decryptedChunk);

          offset += encLen;
          chunkIndex++;

          self.postMessage({
            type: "PROGRESS",
            processed: Math.min(produced, originalSize),
            total: originalSize,
          });
        }

        // Clear sensitive data
        key.fill(0);
        baseNonce.fill(0);
        header.clear();
        header.free();
        await writable.close();

        self.postMessage({
          type: "DONE_OPFS",
          filename: opfsFilename,
          size: totalWritten
        });
      } else {
        // Stream decrypt
        const outChunks: Uint8Array[] = [];
        let offset = HEADER_SIZE;
        let chunkIndex = 0;
        let produced = 0;

        while (offset < file.size) {
          const remaining = file.size - offset;
          const encLen = remaining >= chunkSize + 16 ? chunkSize + 16 : remaining;

          const encChunk = new Uint8Array(
            await file.slice(offset, offset + encLen).arrayBuffer(),
          );

          const plain = decrypt_chunk_wasm(key, baseNonce, chunkIndex, encChunk);

          // Clear encChunk buffer
          zeroBuffer(encChunk);

          outChunks.push(plain);
          produced += plain.length;

          offset += encLen;
          chunkIndex++;

          self.postMessage({
            type: "PROGRESS",
            processed: Math.min(produced, originalSize),
            total: originalSize,
          });
        }

        // Clear sensitive data
        key.fill(0);
        baseNonce.fill(0);
        header.clear();
        header.free();

        // Concat output
        const total = outChunks.reduce((s, c) => s + c.length, 0);
        const result = new Uint8Array(total);
        let pos = 0;
        for (const c of outChunks) {
          result.set(c, pos);
          pos += c.length;
        }

        // Clear outChunks buffers
        zeroBufferArray(outChunks);

        const finalResult =
          result.length > originalSize
            ? result.subarray(0, originalSize)
            : result;

        self.postMessage({ type: "DONE", result: finalResult });
      }
    }

    if (msg.type === "CLEAR_RESULT") {
      self.postMessage({ type: "CLEARED" });
    }

    if (msg.type === "CLEANUP_OPFS") {
      const { filename } = msg;

      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(filename);
        self.postMessage({ type: "CLEANED_OPFS" });
      } catch  {
        self.postMessage({ type: "CLEANED_OPFS" });
      }
    }
  } catch (err) {
    self.postMessage({
      type: "ERROR",
      message: err?.toString() ?? "Worker error",
    } as WorkerResponse);
  }
};
