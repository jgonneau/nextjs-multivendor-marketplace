import { notFound, redirect } from "next/navigation";
import { DEMO_HOME, isDemoView } from "@/lib/demo/store";

/** /demo/vendor → /demo/vendor/my-shops, etc. */
export default async function DemoViewIndex({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!isDemoView(view)) notFound();
  redirect(`/demo/${view}${DEMO_HOME[view]}`);
}
