"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Store, Loader2, ChevronDown, Package } from "lucide-react"
import { CATEGORIAS_KIOSCO, type CategoriaKiosco } from "@/lib/catalogos/kiosco"
import { precargarCatalogoKiosco } from "@/lib/store"

const CONDICIONES_IVA = [
  { value: "monotributista", label: "Monotributista" },
  { value: "responsable_inscripto", label: "Responsable Inscripto" },
  { value: "excento", label: "Exento de IVA" },
]

function formatCuit(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

export default function OnboardingPage() {
  const [paso, setPaso] = useState(1)
  const [nombreComercio, setNombreComercio] = useState("")
  const [cuit, setCuit] = useState("")
  const [condicionIva, setCondicionIva] = useState("monotributista")
  const [domicilio, setDomicilio] = useState("")
  const [categoriasSeleccionadas, setCategorias] = useState<Set<CategoriaKiosco>>(
    new Set(CATEGORIAS_KIOSCO)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const toggleCategoria = (c: CategoriaKiosco) => {
    setCategorias((prev) => {
      const next = new Set(prev)
      next.has(c) ? next.delete(c) : next.add(c)
      return next
    })
  }

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
      .insert({
        nombre: nombreComercio.trim(),
        cuit: cuit.trim() || null,
        condicion_iva: condicionIva,
        domicilio: domicilio.trim() || null,
        punto_venta: 1,
        ultimo_numero_comprobante: 0,
      })
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

    // Precargar catálogo si el usuario eligió categorías
    if (categoriasSeleccionadas.size > 0) {
      await precargarCatalogoKiosco(Array.from(categoriasSeleccionadas))
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
            {paso === 1 ? "Poné el nombre de tu comercio para empezar"
              : paso === 2 ? "Datos fiscales para los comprobantes"
              : "Precargá el stock de tu kiosco"}
          </p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((p) => (
            <div key={p} className={`h-1.5 rounded-full transition-all ${p === paso ? "w-8 bg-accent" : p < paso ? "w-4 bg-accent/50" : "w-4 bg-border"}`} />
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <form onSubmit={
            paso === 1 ? (e) => { e.preventDefault(); setPaso(2) }
            : paso === 2 ? (e) => { e.preventDefault(); setPaso(3) }
            : handleCrearComercio
          } className="space-y-4">

            {paso === 1 && (
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
            )}

            {paso === 2 && (
              <>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                    CUIT <span className="text-muted-foreground/50 normal-case font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={cuit}
                    onChange={(e) => setCuit(formatCuit(e.target.value))}
                    className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
                    placeholder="20-12345678-9"
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                    Condición frente al IVA
                  </label>
                  <div className="relative">
                    <select
                      value={condicionIva}
                      onChange={(e) => setCondicionIva(e.target.value)}
                      className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm appearance-none pr-10"
                    >
                      {CONDICIONES_IVA.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                    Domicilio comercial <span className="text-muted-foreground/50 normal-case font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={domicilio}
                    onChange={(e) => setDomicilio(e.target.value)}
                    className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
                    placeholder="Av. Corrientes 1234, CABA"
                  />
                </div>

                <p className="text-xs text-muted-foreground text-center pt-1">
                  Podés completar o modificar estos datos más adelante en Configuración
                </p>
              </>
            )}

            {paso === 3 && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-accent" />
                  <p className="text-sm font-semibold text-foreground">Stock inicial de kiosco</p>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Precargamos ~100 productos típicos con precios de mayo 2026. Podés editar todo después.
                </p>
                <div className="space-y-2">
                  {CATEGORIAS_KIOSCO.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCategoria(c)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        categoriasSeleccionadas.has(c)
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-foreground hover:border-accent/40"
                      }`}
                    >
                      <span>{c}</span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                        categoriasSeleccionadas.has(c) ? "border-accent bg-accent text-white" : "border-muted-foreground/40"
                      }`}>
                        {categoriasSeleccionadas.has(c) ? "✓" : ""}
                      </span>
                    </button>
                  ))}
                </div>
                {categoriasSeleccionadas.size === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Sin selección → empezás con el stock vacío
                  </p>
                )}
              </>
            )}


            {error && (
              <p className="text-destructive text-sm text-center bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              {paso > 1 && (
                <button
                  type="button"
                  onClick={() => setPaso(paso - 1)}
                  className="flex-1 border border-border text-foreground font-semibold py-3.5 rounded-xl hover:bg-secondary transition-colors text-sm"
                >
                  Atrás
                </button>
              )}
              <button
                type="submit"
                disabled={loading || (paso === 1 && !nombreComercio.trim())}
                className="flex-1 bg-accent text-accent-foreground font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_oklch(0.83_0.17_163/0.25)] text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {categoriasSeleccionadas.size > 0 ? "Cargando productos..." : "Configurando..."}
                  </span>
                ) : paso < 3 ? "CONTINUAR →" : "EMPEZAR A VENDER"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
