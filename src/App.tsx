import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import {
  initWasm,
  add,
  reverse,
  invert_bytes,
  identify,
  encrypt_string,
  decrypt_string,
  encrypt_file,
  decrypt_file,
} from "./wasm/index";

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const worker = new Worker(
      new URL("./worker/crypto.worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (e) => console.log(e.data);
    worker.postMessage({ type: "PING" });

    return () => worker.terminate();
  }, []);

  useEffect(() => {
    (async () => {
      await initWasm();
      console.log(add(2, 3));
      console.log(reverse("Hello"));

      const original = new Uint8Array([0, 1, 2, 127, 128, 255]);

      const inverted = invert_bytes(original);
      const restored = invert_bytes(inverted);
      const same = identify(original);

      console.log("Original: ", original);
      console.log("Inverted: ", inverted);
      console.log("Restored: ", restored);
      console.log("Same: ", same);

      const password = "LoveAmericano99!";
      const message = "Hello Allcrypt";

      const encrypted = encrypt_string(password, message);
      console.log("Encrypted: ", encrypted);

      const decrypted = decrypt_string(password, encrypted);
      console.log("Decrypted: ", decrypted);

      const text = "INI FILE TEST";
      const bytes = new TextEncoder().encode(text);
      console.log("Original File: ", text);
      console.log("Original File Size: ", bytes.length);

      const encryptedFile = encrypt_file("passsword123", bytes, 20);
      console.log("Encrypted File: ", encryptedFile);
      console.log("Encrypted File Size: ", encryptedFile.length);

      const decryptedFile = decrypt_file("passsword123", encryptedFile);
      console.log("Decrypted File: ", decryptedFile);
      console.log("Decrypted File Size: ", decryptedFile.length);

      console.log("Match: ", new TextDecoder().decode(decryptedFile) === text);
    })();
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
