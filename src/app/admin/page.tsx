import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listarCandidatos } from "@/lib/db";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAdmin()) redirect("/admin/login");

  const candidatos = await listarCandidatos();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

  // Commit del deploy (ver next.config.mjs); vacío en local.
  const version = process.env.COMMIT_SHA?.slice(0, 7) || null;

  return <AdminPanel candidatosInicial={candidatos} baseUrl={baseUrl} version={version} />;
}
