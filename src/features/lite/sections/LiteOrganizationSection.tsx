"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { Avatar } from "../../../components/ui/Avatar";
import { ImageUploadField } from "../../../components/forms/ImageUploadField";
import { InlineToast } from "../../../components/forms/InlineToast";
import { applicationServices } from "../../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import { canManageOrganization } from "../../../security/rbac";
import { buildPublicAvatarUrl } from "../../../services/storage/profileMediaStorage";

// Lite Settings real-modules pass (2026-08-27): logo-only this pass -- the shipped MN-8 backend
// (organizationsRepository.update) only supports logoPath, not name/sector, so name is shown
// read-only rather than claiming an edit capability that doesn't exist server-side. Gated to Super
// Admin/Organization Admin via canManageOrganization, the same hardened same-tenant-only check
// desktop/mobile Settings already use -- every other role sees the org name and a disabled upload
// control with a reason, matching UserAdministration's existing disabled-with-reason pattern.
export function LiteOrganizationSection() {
  const { session } = useAuth();
  const user = session.user;
  const scope = useMemo(() => (user ? tenantScopeFromUser(user) : undefined), [user]);
  const canManageLogo = user ? canManageOrganization(user, user.organizationId) : false;

  const [org, setOrg] = useState<{ name: string; logoPath?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!scope || !user) return;
    let cancelled = false;
    applicationServices.organizationsRepository
      .getById(scope, user.organizationId)
      .then((organization) => {
        if (cancelled) return;
        setOrg({ name: organization?.name ?? "", logoPath: organization?.logoPath });
      })
      .catch(() => {
        if (!cancelled) setOrg(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, user]);

  if (!user) {
    return <p className="text-xs text-[#5F6B73]">Sign in to view your organization.</p>;
  }

  const uploadLogo = async (file: File) => {
    const query = new URLSearchParams({ fileName: file.name, mimeType: file.type, sizeBytes: String(file.size) });
    const response = await fetch(`/api/organizations/logo?${query.toString()}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    const payload = await response.json().catch(() => ({})) as { error?: string; path?: string };
    if (!response.ok || !payload.path) throw new Error(payload.error ?? "Logo upload failed.");
    return { path: payload.path };
  };

  const onLogoUploaded = (path: string) => {
    setOrg((current) => (current ? { ...current, logoPath: path } : current));
    setToast({ tone: "success", message: "Organization logo updated." });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link href="/lite/settings" className="flex items-center gap-1 text-xs font-semibold text-[#5F6B73] hover:text-[#0F1117]">
        <ChevronLeft size={14} /> Settings
      </Link>
      <div>
        <h1 className="text-sm font-semibold text-[#0F1117]">Organization</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Your business name and details.</p>
      </div>

      {toast && <InlineToast tone={toast.tone} message={toast.message} />}

      <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4">
        <ImageUploadField
          label="logo"
          fallback={<Avatar initials={(org?.name || "Org").slice(0, 2).toUpperCase()} imageUrl={buildPublicAvatarUrl(org?.logoPath)} size="md" />}
          disabled={!canManageLogo}
          disabledReason="Only Super Admin and Organization Admin can update the organization logo."
          onUpload={uploadLogo}
          onUploaded={onLogoUploaded}
          className="mb-4"
        />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">Organization Name</p>
        <p className="mt-1 text-sm text-[#0F1117]">{loading ? "Loading..." : org?.name || "Not set up yet"}</p>
      </div>
    </div>
  );
}
