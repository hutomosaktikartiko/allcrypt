import { useEffect, useRef, useState } from "react";
import type { WorkerRequest, WorkerResponse } from "../worker/types";

export function useEncryptionWorker() {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const resultRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../worker/crypto.worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (e) => {
      const msg = e.data as WorkerResponse;

      console.log("Message received in hook:", msg);

      if (msg.type === "READY") {
        setReady(true);
      }

      if (msg.type === "PROGRESS") {
        setProgress({ done: msg.processed, total: msg.total });
      }

      if (msg.type === "DONE") {
        resultRef.current = msg.result;
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

  function encryptStream(file: File, password: string, chunkExp = 20) {
    setResult(null);
    setError(null);
    
    workerRef.current?.postMessage({
      type: "ENCRYPT_STREAM",
      password,
      file,
      chunkExp,
    } as WorkerRequest);
  }

  function decryptStream(file: File, password: string) {
    setResult(null);
    setError(null);

    workerRef.current?.postMessage({
      type: "DECRYPT_STREAM",
      password,
      file,
    } as WorkerRequest);
  }

  function zeroBuffer(buffer: Uint8Array): void {
    buffer.fill(0);
  }

  function clearResult(): void {
    if (resultRef.current) {
      zeroBuffer(resultRef.current);
    }
    setResult(null);
    workerRef.current?.postMessage({ type: "CLEAR_RESULT" } as WorkerRequest);
  }

  return {
    ready,
    result,
    error,
    progress,
    encryptStream,
    decryptStream,
    clearResult,
  };
}
