import init, { encrypt_file, decrypt_file } from "../wasm/allcrypt_wasm.js";
import type { WorkerRequest, WorkerResponse } from "./types.js";

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
      const total = file.size;

      const chunks: Uint8Array[] = [];

      let offset = 0;
      while (offset < file.size) {
        const slice = file.slice(offset, offset + chunkSize);
        const buffer = new Uint8Array(await slice.arrayBuffer());

        // Encrypt chunk
        const encrypted = encrypt_file(password, buffer, chunkExp);

        chunks.push(encrypted);

        offset += buffer.length;

        self.postMessage({
          type: "PROGRESS",
          processed: offset,
          total,
        } as WorkerResponse);
      }

      // Merge chunks
      const totalSize = chunks.reduce((s, c) => s + c.length, 0);
      const result = new Uint8Array(totalSize);
      let pos = 0;
      for (const chunk of chunks) {
        result.set(chunk, pos);
        pos += chunk.length;
      }

      self.postMessage({
        type: "DONE",
        result,
      } as WorkerResponse);
    }

    if (msg.type === "DECRYPT_STREAM") {
      const { password, file } = msg;
      let buffer = new Uint8Array(await file.arrayBuffer());

      const result = decrypt_file(password, buffer);

      self.postMessage({
        type: "DONE",
        result,
      } as WorkerResponse);
    }
  } catch (err: any) {
    self.postMessage({
      type: "ERROR",
      message: err?.toString() ?? "Worker error",
    } as WorkerResponse);
  }
};
