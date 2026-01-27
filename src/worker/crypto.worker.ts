import init, { encrypt_file, decrypt_file } from "../wasm/allcrypt_wasm.js";

let initialized = false;

async function initWasm() {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

self.onmessage = async (e) => {
  const msg = e.data;
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

    if (msg.type === "ENCRYPT") {
      const result = encrypt_file(msg.password, msg.fileBytes, msg.chunkExp);

      self.postMessage({ type: "DONE", result });
    }

    if (msg.type === "DECRYPT") {
      const result = decrypt_file(msg.password, msg.encryptedBytes);

      self.postMessage({ type: "DONE", result });
    }
  } catch (err: any) {
    self.postMessage({
      type: "ERROR",
      message: err?.toString() ?? "Worker error",
    });
  }
};
