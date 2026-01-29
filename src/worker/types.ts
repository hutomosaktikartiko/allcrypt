export type WorkerRequest =
  | { type: "INIT" }
  | {
      type: "ENCRYPT_STREAM";
      password: string;
      file: File;
      chunkExp: number;
    }
  | {
      type: "DECRYPT_STREAM";
      password: string;
      file: File;
    }
  | { type: "CLEAR_RESULT" };

export type WorkerResponse =
  | { type: "READY" }
  | { type: "PROGRESS"; processed: number; total: number }
  | { type: "DONE"; result: Uint8Array }
  | { type: "ERROR"; message: string }
  | { type: "CLEARED" };
