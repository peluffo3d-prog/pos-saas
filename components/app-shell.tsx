"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ShoppingCart, Package, Wallet, Menu, X, BarChart3, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const bottomNav = [
  { href: "/", icon: ShoppingCart, label: "POS" },
  { href: "/stock", icon: Package, label: "Stock" },
  { href: "/caja", icon: Wallet, label: "Caja" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Side Drawer */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <p className="font-display font-bold text-foreground text-sm leading-tight">Mi Comercio</p>
              <p className="text-[11px] text-muted-foreground">POS SaaS</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { href: "/", icon: ShoppingCart, label: "Punto de Venta" },
            { href: "/stock", icon: Package, label: "Stock" },
            { href: "/caja", icon: Wallet, label: "Caja" },
            { href: "/ventas", icon: BarChart3, label: "Historial Ventas" },
          ].map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <a
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? "text-accent" : "text-muted-foreground"}`}
                />
                {label}
              </a>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-muted-foreground hover:text-destructive hover:bg-secondary rounded-xl transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-30">
        <div className="flex h-16 max-w-lg mx-auto">
          {bottomNav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <a
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-semibold tracking-wide uppercase">{label}</span>
              </a>
            )
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" strokeWidth={2} />
            <span className="text-[10px] font-semibold tracking-wide uppercase">Menú</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
