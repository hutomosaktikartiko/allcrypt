export type WorkerRequest =
  | { type: "INIT" }
  | {
      type: "ENCRYPT_STREAM";
      password: string;
      file: File;
      chunkExp: number;
      useOPFS?: boolean;
      opfsFilename?: string;
    }
  | {
      type: "DECRYPT_STREAM";
      password: string;
      file: File;
      useOPFS?: boolean;
      opfsFilename?: string;
    }
  | { type: "CLEAR_RESULT" }
  | { type: "CLEANUP_OPFS"; filename: string };

export type WorkerResponse =
  | { type: "READY" }
  | { type: "PROGRESS"; processed: number; total: number }
  | { type: "DONE"; result: Uint8Array }
  | { type: "DONE_OPFS"; filename: string; size: number }
  | { type: "ERROR"; message: string }
  | { type: "CLEARED" }
  | { type: "CLEANED_OPFS"; filename: string };
