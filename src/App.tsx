import React, { useEffect, useState } from "react";
import "./App.css";

import { useEncryptionWorker } from "./hooks/useEncryptionWorker";

export default function App() {
  const { ready, result, encryptStream, decryptStream, progress } =
    useEncryptionWorker();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;

    encryptStream("password123", e.target.files[0]);
  }

  return (
    <div className="p-4 space-y-2">
      <input type="file" onChange={onFile} />

      {progress && (
        <p>Progress: {Math.round((progress.done / progress.total) * 100)}%</p>
      )}

      {result && <p>Encrypted size: {result.length / 1024} KB </p>}
    </div>
  );
}
