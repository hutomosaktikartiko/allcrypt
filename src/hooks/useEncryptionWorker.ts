import { useEffect, useRef, useState } from "react";
import type { WorkerRequest } from "../worker/types";

export function useEncryptionWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../worker/crypto.worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (e) => {
      const msg = e.data;

      console.log("Message received in hook:", msg);

      if (msg.type === "READY") {
        setReady(true);
      }

      if (msg.type === "PROGRESS") {
        setProgress({ done: msg.processed, total: msg.total });
      }

      if (msg.type === "DONE") {
        setResult(msg.result);
      }

      if (msg.type === "ERROR") {
        setError(msg.message);
      }
    };

    // Initialize worker
    worker.postMessage({ type: "INIT" });

    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  function encryptStream(password: string, file: File, chunkExp = 20) {
    setResult(null);
    setError(null);
    workerRef.current?.postMessage({
      type: "ENCRYPT_STREAM",
      password,
      file,
      chunkExp,
    } as WorkerRequest);
  }

  function decryptStream(password: string, file: File) {
    setResult(null);
    setError(null);
    workerRef.current?.postMessage({
      type: "DECRYPT_STREAM",
      password,
      file,
    } as WorkerRequest);
  }

  return {
    ready,
    result,
    error,
    progress,
    encryptStream,
    decryptStream,
  };
}
