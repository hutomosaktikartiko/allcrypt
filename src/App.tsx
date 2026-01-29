import { useState, useRef, useEffect } from "react";
import {
  IconShield,
  IconLock,
  IconUnlock,
  IconFile,
  IconCloud,
  IconWarning,
  IconRefresh,
  IconCopy,
  IconProcessing,
  IconCheck,
  IconClose,
  IconDownload,
  IconReset,
} from "./components/Icons";
import { useEncryptionWorker } from "./hooks/useEncryptionWorker";

type Mode = "encrypt" | "decrypt";
type ToastType = "success" | "error";

interface Toast {
  type: ToastType;
  message: string;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("encrypt");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevResultRef = useRef<Uint8Array | null>(null);
  const prevErrorRef = useRef<string | null>(null);
  const prevOpfsFilenameRef = useRef<string | null>(null);

  const {
    result,
    error,
    progress,
    encryptStream,
    decryptStream,
    clearResult,
    opfsFilename,
    encryptStreamOPFS,
    decryptStreamOPFS,
    downloadFromOPFS,
    cleanUpOPFS,
    isOPFSAvailable,
  } = useEncryptionWorker();

  const isProcessing = hasStarted && !result && !opfsFilename && !error;
  const isFinished = hasStarted && (result !== null || opfsFilename !== null);
  const processedData = result;
  const progressPercent =
    progress && progress.total > 0
      ? (progress.done / progress.total) * 100
      : 0;
  const isLocked = isProcessing || isFinished;
  const useOpfs = isOPFSAvailable() && file && file.size > 100 * 1024 * 1024; // Use OPFS for files larger than 100MB

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const resultChanged = result && result !== prevResultRef.current;
    const opfsChanged = opfsFilename && opfsFilename !== prevOpfsFilenameRef.current;

    if ((resultChanged || opfsChanged) && hasStarted) {
      queueMicrotask(() => {
        showToast(
          "success",
          `${mode === "encrypt" ? "Encryption" : "Decryption"} process complete!`
        );
      });
    }
    
    prevResultRef.current = result;
    prevOpfsFilenameRef.current = opfsFilename;
  }, [result, hasStarted, mode, opfsFilename]);

  useEffect(() => {
    if (error && error !== prevErrorRef.current && hasStarted) {
      queueMicrotask(() => {
        showToast("error", error);
      });
    }
    prevErrorRef.current = error;
  }, [error, hasStarted]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    setToast(null);
    setHasStarted(false);
    setFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (isLocked) return;
    if (!e.dataTransfer.files?.[0]) return;

    setToast(null);
    setHasStarted(false);
    setFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const generatePassword = () => {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let generated = "";
    for (let i = 0; i < 16; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      generated += charset[randomIndex];
    }
    setPassword(generated);
    showToast("success", "Strong password generated successfully!");
  };

  const copyToClipboard = () => {
    if (!password) return;

    const textArea = document.createElement("textarea");
    textArea.value = password;

    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        showToast("success", "Password copied to clipboard!");
      } else {
        showToast("error", "Automatic copy failed. Please copy manually.");
      }
    } catch (err) {
      console.error("Fallback copy failed", err);
      showToast("error", "Copy failed. Browser blocked clipboard access.");
    }

    document.body.removeChild(textArea);
  };

  const handleStart = () => {
    if (!file || !password) return;

    setHasStarted(true);

    if (useOpfs) {
      if (mode === "encrypt") {
        encryptStreamOPFS(file, password);
      } else {
        decryptStreamOPFS(file, password);
      }
    } else {
      if (mode === "encrypt") {
      encryptStream(file, password);
    } else {
      decryptStream(file, password);
    }
    }
  };

  const handleDownload = () => {
    if (!file) return;

    if (opfsFilename) {
      const downloadName = mode === "encrypt"
      ? `${file.name}.allcrypt`
      : file.name.replace('.allcrypt', '');
      downloadFromOPFS(downloadName);
    } else {
      if (!processedData) return;
      
      const buf = processedData.buffer.slice(
        processedData.byteOffset,
        processedData.byteOffset + processedData.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([buf]);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      if (mode === "encrypt") {
        a.download = `${file.name}.allcrypt`;
      } else {
        a.download = file.name.replace('.allcrypt', '');
      }

      a.click();
      URL.revokeObjectURL(url);
    }

    showToast("success", "File downloaded successfully!");
  };

  const handleReset = () => {
    setHasStarted(false);
    setToast(null);
    setFile(null);

    // Clear result from worker
    clearResult();
    // Clean opfs
    cleanUpOPFS();
  };

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex items-center justify-center p-4 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Main Card */}
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        {/* === HEADER === */}
        <div className="bg-white p-8 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`p-2 rounded-xl transition-colors duration-300 ${
                mode === "encrypt"
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-rose-100 text-rose-600"
              }`}
            >
              <IconShield size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                AllCrypt
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Local Encryption & Decryption (Offline)
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 bg-slate-50 mx-8 mt-6 rounded-2xl border border-slate-200">
          <button
            onClick={() => setMode("encrypt")}
            disabled={isLocked}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              mode === "encrypt"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <IconLock size={18} /> Encrypt
          </button>
          <button
            onClick={() => setMode("decrypt")}
            disabled={isLocked}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              mode === "decrypt"
                ? "bg-white text-rose-600 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <IconUnlock size={18} /> Decrypt
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group
              ${
                file
                  ? "border-emerald-200 bg-emerald-50/30"
                  : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
              }
              ${isLocked ? "opacity-50 pointer-events-none" : ""}
            `}
            onDrop={!isLocked ? handleDrop : undefined}
            onDragOver={!isLocked ? handleDragOver : undefined}
            onClick={() => !isLocked && fileInputRef.current?.click()}
          >
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isLocked}
            />

            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <IconFile size={26} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 line-clamp-1 break-all">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  disabled={isLocked}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors disabled:cursor-not-allowed"
                >
                  <IconClose size={22} />
                </button>
              </div>
            ) : (
              <div className="py-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <IconCloud size={36} />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">
                  Choose Your File
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Click to browse or drop file here
                </p>
              </div>
            )}
          </div>

          {/* Warning Information */}
          <div
            className={`bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 items-start ${
              isLocked ? "opacity-50" : ""
            }`}
          >
            <IconWarning
              className="text-amber-500 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div className="text-sm text-amber-800">
              <span className="font-semibold block mb-0.5">Resource Usage</span>
              The larger the file size, the more resources (RAM & CPU) your
              browser will need to process it.
            </div>
          </div>

          {/* Password Input */}
          <div className={isLocked ? "opacity-50 pointer-events-none" : ""}>
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
              Password / Key
            </label>
            <div className="relative flex shadow-sm rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password..."
                disabled={isLocked}
                className="w-full px-4 py-3.5 outline-none text-slate-700 placeholder:text-slate-400 disabled:bg-slate-50"
              />

              {mode === "encrypt" && (
                <button
                  onClick={password ? copyToClipboard : generatePassword}
                  disabled={isLocked}
                  className={`px-5 font-semibold text-sm flex items-center gap-2 transition-all duration-200
                    ${
                      password
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    } disabled:cursor-not-allowed`}
                >
                  {password ? (
                    <>
                      <IconCopy size={18} /> Copy
                    </>
                  ) : (
                    <>
                      <IconRefresh size={18} /> Generate
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 ml-1">
              {password
                ? "Make sure you save this password."
                : "Click 'Generate' to create a random password."}
            </p>
          </div>

          {/* Footer Actions (Process / Progress / Download) */}
          <div className="pt-2">
            {isProcessing ? (
              // 1. Loading State
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span className="flex items-center gap-2">
                    <IconProcessing
                      size={18}
                      className="animate-pulse text-indigo-500"
                    />{" "}
                    Processing...
                  </span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ease-out ${
                      mode === "encrypt" ? "bg-indigo-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            ) : isFinished ? (
              // 2. Finished State (Download & Reset)
              <div className="flex gap-3 animate-bounce-in">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-4 rounded-xl text-white font-bold text-lg bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <IconDownload size={22} />
                  Download Result
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-4 rounded-xl font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center gap-2"
                  title="Restart"
                >
                  <IconReset size={22} />
                </button>
              </div>
            ) : (
              // 3. Initial State (Start Button)
              <button
                onClick={handleStart}
                disabled={!file || !password}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]
                  ${
                    !file || !password
                      ? "bg-slate-300 cursor-not-allowed shadow-none text-slate-500"
                      : mode === "encrypt"
                        ? "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-300"
                        : "bg-rose-600 hover:bg-rose-700 hover:shadow-rose-300 shadow-rose-200"
                  }
                `}
              >
                {mode === "encrypt" ? (
                  <IconLock size={22} />
                ) : (
                  <IconUnlock size={22} />
                )}
                {mode === "encrypt"
                  ? "Start File Encryption"
                  : "Start File Decryption"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-0 right-0 mx-auto w-fit max-w-[90vw] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl animate-bounce-in z-50 border
          ${
            toast.type === "success"
              ? "bg-white text-emerald-800 border-emerald-100"
              : "bg-white text-rose-800 border-rose-100"
          }
        `}
        >
          <div
            className={`p-1 rounded-full ${
              toast.type === "success"
                ? "bg-emerald-100 text-emerald-600"
                : "bg-rose-100 text-rose-600"
            }`}
          >
            {toast.type === "success" ? (
              <IconCheck size={22} />
            ) : (
              <IconWarning size={22} />
            )}
          </div>
          <p className="font-semibold text-sm text-slate-800">{toast.message}</p>
        </div>
      )}

      {/* Tailwind Animation Styles */}
      <style>{`
        @keyframes bounce-in {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
