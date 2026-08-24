"use client";

import { useRef, useState, type ReactNode } from "react";
import { Camera } from "lucide-react";
import { InlineToast } from "./InlineToast";

type ImageUploadFieldProps = {
  label: string;
  fallback: ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  onUpload: (file: File) => Promise<{ path: string }>;
  onUploaded: (path: string) => void;
  className?: string;
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const MAX_CLIENT_PRECHECK_BYTES = 4 * 1024 * 1024;

// MN-8 (2026-08-24): one component for all four call sites this sprint touches (desktop
// Profile/Organization, mobile Profile/Organization) -- upload mechanics are identical everywhere,
// only the endpoint (onUpload) and post-upload persistence (onUploaded) differ per caller. The
// client-side size/type check here is a UX nicety only -- validateAvatarUpload on the server
// (src/services/storage/profileMediaStorage.ts) remains the real authority.
export function ImageUploadField({ label, fallback, disabled, disabledReason, onUpload, onUploaded, className }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_CLIENT_PRECHECK_BYTES) {
      setError("Image must be 4MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const result = await onUpload(file);
      onUploaded(result.path);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        {fallback}
        <button
          type="button"
          onClick={() => !disabled && inputRef.current?.click()}
          disabled={disabled || busy}
          className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[rgba(15,17,23,0.12)] bg-white px-3 text-xs font-semibold text-[#0F1117] hover:bg-[#F2F3F5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Camera size={14} />
          {busy ? "Uploading…" : `Change ${label.toLowerCase()}`}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.currentTarget.value = "";
        }}
      />
      {disabled && disabledReason && <InlineToast tone="info" message={disabledReason} />}
      {error && <InlineToast tone="error" message={error} />}
    </div>
  );
}
