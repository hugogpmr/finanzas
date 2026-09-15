import Link from "next/link";
import {
  ArrowLeftRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Tags,
  Target,
  Wallet,
  Wand2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  // getSession() lee la cookie en local, sin llamar a Supabase por red.
  // Vale para mostrar el email: la comprobación de seguridad ya la hizo
  // src/proxy.ts con getUser() (que sí revalida contra el servidor).
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-3 py-3 text-sm font-semibold">
          Finanzas
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/dashboard" />}>
                    <LayoutDashboard />
                    <span>Resumen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/cuentas" />}>
                    <Wallet />
                    <span>Cuentas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/transacciones" />}>
                    <ArrowLeftRight />
                    <span>Transacciones</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/categorias" />}>
                    <Tags />
                    <span>Categorías</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/reglas" />}>
                    <Wand2 />
                    <span>Reglas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/presupuestos" />}>
                    <PiggyBank />
                    <span>Presupuestos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/objetivos" />}>
                    <Target />
                    <span>Objetivos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/deudas" />}>
                    <CreditCard />
                    <span>Deudas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-2 px-3 py-3">
          <p className="truncate text-xs text-muted-foreground">
            {session?.user.email}
          </p>
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          </form>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
