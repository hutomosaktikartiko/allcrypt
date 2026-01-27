import { useEffect, useRef, useState } from "react";

export function useEncryptionWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
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

  function encrypt(password: string, fileBytes: Uint8Array, chunkExp = 20) {
    setResult(null);
    setError(null);
    workerRef.current?.postMessage({
      type: "ENCRYPT",
      password,
      fileBytes,
      chunkExp,
    });
  }

  function decrypt(password: string, encryptedBytes: Uint8Array) {
    setResult(null);
    setError(null);
    workerRef.current?.postMessage({
      type: "DECRYPT",
      password,
      encryptedBytes,
    });
  }

  return {
    ready,
    result,
    error,
    encrypt,
    decrypt,
  };
}
