import { notFound } from "next/navigation";
import { KeelApp } from "@/components/KeelApp";
import { WORKSPACE_VIEWS } from "@/lib/workspace.mjs";

type Role = keyof typeof WORKSPACE_VIEWS;

export default async function WorkspacePage({ params }: { params: Promise<{ role: string; view: string }> }) {
  const { role, view } = await params;
  if (!Object.hasOwn(WORKSPACE_VIEWS, role) || !WORKSPACE_VIEWS[role as Role].includes(view)) notFound();
  return <KeelApp initialRole={role as Role} initialView={view} />;
}
