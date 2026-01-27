import init, {
  add,
  reverse,
  invert_bytes,
  identify,
  encrypt_string,
  decrypt_string,
  encrypt_file,
  decrypt_file,
} from "./allcrypt_wasm.js";

let initialized = false;

export async function initWasm() {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

export {
  add,
  reverse,
  invert_bytes,
  identify,
  encrypt_string,
  decrypt_string,
  encrypt_file,
  decrypt_file,
};
