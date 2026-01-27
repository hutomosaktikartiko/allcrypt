import { useEffect, useState } from "react";
import "./App.css";

import { useEncryptionWorker } from "./hooks/useEncryptionWorker";

export default function App() {
  const { ready, result, encrypt, decrypt } = useEncryptionWorker();

  const [encrypted, setEncrypted] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (!ready) return;

    const password = "password123";
    const text = "INI FILE TEST";
    const original = new TextEncoder().encode(text);

    encrypt(password, original);
  }, [ready]);

  useEffect(() => {
    if (!result || encrypted) return;

    console.log("Encrypted file size:", result.length);
    setEncrypted(result);

    decrypt("password123", result);
  }, [result]);

  useEffect(() => {
    if (!encrypted || !result) return;

    const text = new TextDecoder().decode(result);
    console.log("Decrypted:", text);
  }, [encrypted, result]);

  return (
    <div className="p-4">
      <p>Worker ready: {String(ready)}</p>
      <p>Result: {result}</p>
    </div>
  );
}
