import { notFound } from "next/navigation";
import { DemoShell } from "@/components/demo/DemoShell";
import { isDemoView } from "@/lib/demo/store";

export default async function DemoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!isDemoView(view)) notFound();
  return <DemoShell view={view}>{children}</DemoShell>;
}
