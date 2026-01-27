import { useEffect, useState } from "react";
import "./App.css";
import { useEncryptionWorker } from "./hooks/useEncryptionWorker";
import type React from "react";

export default function App() {
  const { ready, result, error, progress, encryptStream, decryptStream } =
    useEncryptionWorker();

  const [file, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  const [isEncrypt, setIsEncrypt] = useState(true);

  const [encryptedFile, setEncryptedFile] = useState<Uint8Array | null>(null);
  const [decryptedFile, setDecryptedFile] = useState<Uint8Array | null>(null);

  const [password, setPassword] = useState("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;

    setFile(e.target.files[0]);
    setFilename(e.target.files[0].name);
  }

  function onEncrypt() {
    if (!file || !password) return;

    setIsEncrypt(true);
    setEncryptedFile(null);
    setDecryptedFile(null);

    encryptStream(password, file);
  }
  function onDecrypt() {
    if (!file || !password) return;

    setIsEncrypt(false);
    setEncryptedFile(null);
    setDecryptedFile(null);

    decryptStream(password, file);
  }

  useEffect(() => {
    if (!result) return;

    if (isEncrypt) {
      setEncryptedFile(result);
    } else {
      setDecryptedFile(result);
    }
  }, [result, isEncrypt]);

  function onDownload(bytes: Uint8Array) {
    const buf = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([buf]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    if (isEncrypt) {
      a.download = `${filename}.allcrypt`;
    } else {
      // remove .allcrypt extension if exists
      a.download = filename.replace(".allcrypt", "");
    }
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 space-y-3 max-w-md">
      <h1 className="font-bold text-lg">AllCrypt</h1>

      {!ready && <p>Initializing worker...</p>}

      <input type="file" onChange={onFile} />

      <input
        type="password"
        value={password}
        placeholder="Enter password"
        onChange={(e) => setPassword(e.target.value)}
      />

      {progress && (
        <p>Progress: {Math.round((progress.done / progress.total) * 100)}%</p>
      )}

      {error && <p className="text-red-500">{error}</p>}

      {/* Action buttons - Hide when encryped or decrypted file is available */}
      {!encryptedFile && !decryptedFile && (
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-purple-600 text-white rounded"
            onClick={onEncrypt}
          >
            Encrypt File
          </button>
          <button
            className="px-3 py-1 bg-green-600 text-white rounded"
            onClick={onDecrypt}
          >
            Decrypt File
          </button>
        </div>
      )}

      {/* Download encrypted file */}
      {encryptedFile && (
        <div className="space-y-2">
          <p>Encrypted size: {(encryptedFile.length / 1024).toFixed(2)} KB</p>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded"
            onClick={() => onDownload(encryptedFile)}
          >
            Download Encrypted
          </button>
        </div>
      )}

      {/* Download decrypted file */}
      {decryptedFile && (
        <div className="space-y-2">
          <p>Decrypted size: {(decryptedFile.length / 1024).toFixed(2)} KB</p>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded"
            onClick={() => onDownload(decryptedFile)}
          >
            Download Decrypted
          </button>
        </div>
      )}

      {/* Clear button - shown when any result exists */}
      {(encryptedFile || decryptedFile) && (
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-red-600 text-white rounded"
            onClick={() => {
              setFile(null);
              setPassword("");
              setEncryptedFile(null);
              setDecryptedFile(null);
              setFilename("");
            }}
          >
            Clear Result
          </button>
        </div>
      )}
    </div>
  );
}
