/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const __wbg_encryptinitresult_free: (a: number, b: number) => void;
export const encryptinitresult_header: (a: number) => [number, number];
export const encryptinitresult_key: (a: number) => [number, number];
export const encryptinitresult_base_nonce: (a: number) => [number, number];
export const encryptinitresult_clear: (a: number) => void;
export const __wbg_decodedheader_free: (a: number, b: number) => void;
export const decodedheader_chunk_exp: (a: number) => number;
export const decodedheader_salt: (a: number) => [number, number];
export const decodedheader_base_nonce: (a: number) => [number, number];
export const decodedheader_original_size: (a: number) => bigint;
export const decodedheader_clear: (a: number) => void;
export const init_encrypt: (a: number, b: number, c: bigint, d: number) => number;
export const encrypt_chunk_wasm: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
export const decode_header_wasm: (a: number, b: number) => [number, number, number];
export const derive_key_wasm: (a: number, b: number, c: number, d: number) => [number, number, number, number];
export const decrypt_chunk_wasm: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_start: () => void;
