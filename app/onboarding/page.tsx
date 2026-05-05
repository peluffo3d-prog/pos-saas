"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Store, Loader2 } from "lucide-react"

export default function OnboardingPage() {
  const [nombreComercio, setNombreComercio] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkTenant = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data } = await supabase
        .from("tenant_users")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single()
      if (data?.tenant_id) router.push("/")
    }
    checkTenant()
  }, [])

  const handleCrearComercio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreComercio.trim()) return
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({ nombre: nombreComercio.trim() })
      .select()
      .single()

    if (tenantError || !tenant) {
      setError("Error al crear el comercio. Intentá de nuevo.")
      setLoading(false)
      return
    }

    const { error: linkError } = await supabase
      .from("tenant_users")
      .insert({ user_id: user.id, tenant_id: tenant.id, role: "owner" })

    if (linkError) {
      setError("Error al configurar la cuenta. Intentá de nuevo.")
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,oklch(0.83_0.17_163/0.07),transparent)]" />

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-5 shadow-[0_0_40px_oklch(0.83_0.17_163/0.4)]">
            <Store className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">¡Casi listo!</h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            Poné el nombre de tu comercio para empezar
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleCrearComercio} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                Nombre del comercio
              </label>
              <input
                type="text"
                value={nombreComercio}
                onChange={(e) => setNombreComercio(e.target.value)}
                required
                autoFocus
                className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
                placeholder="Ej: Almacén El Toro"
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="text-destructive text-sm text-center bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !nombreComercio.trim()}
              className="w-full bg-accent text-accent-foreground font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_oklch(0.83_0.17_163/0.25)] text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Configurando...
                </span>
              ) : "EMPEZAR A VENDER"}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
