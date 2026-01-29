import { useEffect, useRef, useState } from "react";
import type { WorkerRequest, WorkerResponse } from "../worker/types";
import { isOPFSAvailable, readOPFSFile } from "../utils/opfs";

export function useEncryptionWorker() {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opfsFilename, setOpfsFilename] = useState<string | null>(null);
  const [opfsSize, setOpfsSize] = useState<number | null>(null);

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

      if (msg.type === "DONE_OPFS") {
        setOpfsFilename(msg.filename);
        setOpfsSize(msg.size);
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

  async function encryptStreamOPFS(file: File, password: string, chunkExp = 20) {
    const filename = `encrypted-${Date.now()}.tmp`;
    setOpfsFilename(null);
    setOpfsSize(null);
    setResult(null);
    setError(null);
    setProgress(null);

    workerRef.current?.postMessage({
      type: "ENCRYPT_STREAM",
      password,
      file,
      chunkExp,
      useOPFS: true,
      opfsFilename: filename,
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

  async function decryptStreamOPFS(file: File, password: string) {
    const filename = `decrypted-${Date.now()}.tmp`;
    setOpfsFilename(null);
    setOpfsSize(null);
    setResult(null);
    setError(null);
    setProgress(null);

    workerRef.current?.postMessage({
      type: "DECRYPT_STREAM",
      password,
      file,
      useOPFS: true,
      opfsFilename: filename,
    } as WorkerRequest);
  }

  async function downloadFromOPFS(downloadName: string) {
    if (!opfsFilename) return;

    const file = await readOPFSFile(opfsFilename);
    
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
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

  function cleanUpOPFS() {
    if (!opfsFilename) return;

    workerRef.current?.postMessage({
      type: "CLEANUP_OPFS",
      filename: opfsFilename,
    } as WorkerRequest);
    setOpfsFilename(null);
    setOpfsSize(null);
  }

  return {
    ready,
    result,
    error,
    progress,
    opfsFilename,
    opfsSize,
    encryptStream,
    encryptStreamOPFS,
    decryptStream,
    decryptStreamOPFS,
    downloadFromOPFS,
    clearResult,
    cleanUpOPFS,
    isOPFSAvailable: () => isOPFSAvailable(),
  };
}
