import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listarCandidatos } from "@/lib/db";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAdmin()) redirect("/admin/login");

  const candidatos = await listarCandidatos();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

  return <AdminPanel candidatosInicial={candidatos} baseUrl={baseUrl} />;
}
