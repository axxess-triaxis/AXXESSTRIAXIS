"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { Avatar } from "../../../components/ui/Avatar";
import { SelectField, TextField } from "../../../components/forms/FormField";
import { ImageUploadField } from "../../../components/forms/ImageUploadField";
import { InlineToast } from "../../../components/forms/InlineToast";
import { buildPublicAvatarUrl } from "../../../services/storage/profileMediaStorage";

type ProfileForm = {
  displayName: string;
  avatarInitials: string;
  avatarPath: string;
  availability: "public" | "private" | "inactive";
};

const emptyForm: ProfileForm = { displayName: "", avatarInitials: "", avatarPath: "", availability: "public" };

// Lite Settings real-modules pass (2026-08-27): reuses the exact same updateProfile/ImageUploadField/
// buildPublicAvatarUrl pieces X0's ProfilePanel (SettingsSection.tsx) already uses -- no new backend
// route, no RBAC gate (every role edits their own profile). Deliberately not the full ProfilePanel:
// no department/title/timezone fields, matching Lite's own "short, practical" scope elsewhere.
export function LiteProfileSection() {
  const { session, updateProfile } = useAuth();
  const user = session.user;
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      displayName: user.displayName ?? "",
      avatarInitials: user.avatarInitials ?? "",
      avatarPath: user.avatarPath ?? "",
      availability: user.availability ?? "public",
    });
    // Intentionally depends on primitive fields, not the `user` object itself -- matches
    // SettingsSection.tsx's ProfilePanel, whose own object identity changes on every session
    // refresh even when the underlying values haven't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.displayName, user?.avatarInitials, user?.avatarPath, user?.availability]);

  if (!user) {
    return <p className="text-xs text-[#5F6B73]">Sign in to view your profile.</p>;
  }

  const save = async (input: ProfileForm) => {
    setSaving(true);
    setToast(null);
    try {
      await updateProfile(input);
      setToast({ tone: "success", message: "Profile updated." });
    } catch {
      setToast({ tone: "error", message: "Profile could not be updated." });
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    const query = new URLSearchParams({ fileName: file.name, mimeType: file.type, sizeBytes: String(file.size) });
    const response = await fetch(`/api/profile-media/avatar?${query.toString()}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    const payload = await response.json().catch(() => ({})) as { error?: string; path?: string };
    if (!response.ok || !payload.path) throw new Error(payload.error ?? "Avatar upload failed.");
    return { path: payload.path };
  };

  const onAvatarUploaded = (path: string) => {
    const next = { ...form, avatarPath: path };
    setForm(next);
    void save(next);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link href="/lite/settings" className="flex items-center gap-1 text-xs font-semibold text-[#5F6B73] hover:text-[#0F1117]">
        <ChevronLeft size={14} /> Settings
      </Link>
      <div>
        <h1 className="text-sm font-semibold text-[#0F1117]">Profile</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Your name, email, and preferences.</p>
      </div>

      {toast && <InlineToast tone={toast.tone} message={toast.message} />}

      <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4">
        <ImageUploadField
          label="photo"
          fallback={<Avatar initials={form.avatarInitials || "AR"} imageUrl={buildPublicAvatarUrl(form.avatarPath)} size="md" color="bg-[#8B1E2D]" />}
          onUpload={uploadAvatar}
          onUploaded={onAvatarUploaded}
          className="mb-4"
        />
        <div className="flex flex-col gap-3">
          <TextField label="Display Name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
          <TextField label="Email" value={user.email ?? ""} onChange={() => undefined} disabled />
          <SelectField
            label="Availability"
            value={form.availability}
            options={[{ value: "public", label: "Public" }, { value: "private", label: "Private" }, { value: "inactive", label: "Inactive" }]}
            onChange={(event) => setForm({ ...form, availability: event.target.value as ProfileForm["availability"] })}
          />
        </div>
        <button
          type="button"
          onClick={() => void save(form)}
          disabled={saving}
          className="mt-4 w-full rounded-lg bg-[#8B1E2D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
