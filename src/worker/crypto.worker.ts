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
      const { password, file, chunkExp } = msg;

      const chunkSize = 1 << chunkExp;
      const initResult = init_encrypt(password, BigInt(file.size), chunkExp);

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

        chunks.push(encryptedChunk);

        offset += data.length;
        chunkIndex++;

        self.postMessage({
          type: "PROGRESS",
          processed: offset,
          total: file.size,
        });
      }

      // concat output
      const totalSize = chunks.reduce((s, c) => s + c.length, 0);
      const result = new Uint8Array(totalSize);
      let pos = 0;
      for (const c of chunks) {
        result.set(c, pos);
        pos += c.length;
      }

      self.postMessage({ type: "DONE", result });
    }

    if (msg.type === "DECRYPT_STREAM") {
      const { password, file } = msg;

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

      // Concat output
      const total = outChunks.reduce((s, c) => s + c.length, 0);
      const result = new Uint8Array(total);
      let pos = 0;
      for (const c of outChunks) {
        result.set(c, pos);
        pos += c.length;
      }
      const finalResult =
        result.length > originalSize
          ? result.subarray(0, originalSize)
          : result;

      self.postMessage({ type: "DONE", result: finalResult });
    }
  } catch (err: any) {
    self.postMessage({
      type: "ERROR",
      message: err?.toString() ?? "Worker error",
    } as WorkerResponse);
  }
};
