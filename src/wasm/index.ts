import init, {add, reverse, invert_bytes, identify, encrypt_string, decrypt_string} from "./allcrypt_wasm.js";

let initialized = false;

export async function initWasm() {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

export {add, reverse, invert_bytes, identify, encrypt_string, decrypt_string};
