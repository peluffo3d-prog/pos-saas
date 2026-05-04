"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Store } from "lucide-react"

export default function OnboardingPage() {
  const [nombreComercio, setNombreComercio] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Si ya tiene tenant, ir al inicio
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

    // Crear tenant
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

    // Vincular user al tenant como owner
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-success rounded-2xl p-4 mb-4">
            <Store className="h-8 w-8 text-success-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">¡Casi listo!</h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            Poné el nombre de tu comercio para empezar
          </p>
        </div>

        <form onSubmit={handleCrearComercio} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1 tracking-wide">
              Nombre del comercio
            </label>
            <input
              type="text"
              value={nombreComercio}
              onChange={(e) => setNombreComercio(e.target.value)}
              required
              autoFocus
              className="w-full border border-border bg-card text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              placeholder="Ej: Almacén El Toro"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !nombreComercio.trim()}
            className="w-full bg-success text-success-foreground font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? "Configurando..." : "EMPEZAR A VENDER"}
          </button>
        </form>
      </div>
    </main>
  )
}
