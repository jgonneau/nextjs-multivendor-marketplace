import { Nav } from "@/components/Nav";
import { BasketDrawer } from "@/components/BasketDrawer";
import { SiteFooter } from "@/components/SiteFooter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-backdrop flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-24 sm:px-6">{children}</main>
      <SiteFooter />
      <BasketDrawer />
    </div>
  );
}
