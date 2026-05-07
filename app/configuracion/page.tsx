"use client"

import { useState, useEffect } from "react"
import { Settings, Loader2, CheckCircle2, ChevronDown, Store, FileText, MapPin, Hash } from "lucide-react"
import { getTenantInfo, actualizarTenant, type TenantInfo } from "@/lib/store"
import { AppShell } from "@/components/app-shell"

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

export default function ConfiguracionPage() {
  const [info, setInfo] = useState<TenantInfo | null>(null)
  const [nombre, setNombre] = useState("")
  const [cuit, setCuit] = useState("")
  const [condicionIva, setCondicionIva] = useState("monotributista")
  const [domicilio, setDomicilio] = useState("")
  const [puntoVenta, setPuntoVenta] = useState("1")
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    getTenantInfo().then((data) => {
      if (data) {
        setInfo(data)
        setNombre(data.nombre)
        setCuit(data.cuit ?? "")
        setCondicionIva(data.condicionIva ?? "monotributista")
        setDomicilio(data.domicilio ?? "")
        setPuntoVenta(String(data.puntoVenta ?? 1))
      }
      setLoading(false)
    })
  }, [])

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    await actualizarTenant({
      nombre: nombre.trim(),
      cuit: cuit.trim() || undefined,
      condicionIva,
      domicilio: domicilio.trim() || undefined,
      puntoVenta: parseInt(puntoVenta) || 1,
    })
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    )
  }

  const tipoComprobante = condicionIva === "responsable_inscripto" ? "Comprobante B" : "Comprobante C"
  const pvFormatted = String(parseInt(puntoVenta) || 1).padStart(4, "0")
  const lastNum = String(info?.ultimoNumeroComprobante ?? 0).padStart(8, "0")

  return (
    <AppShell>
      {/* Hero */}
      <div className="bg-accent px-5 pt-8 pb-12">
        <div className="max-w-xl mx-auto">
          <p className="text-accent-foreground/70 text-sm mb-1">Ajustes del sistema</p>
          <h1 className="font-display font-bold text-accent-foreground text-xl">Configuración</h1>
        </div>
      </div>

      <div className="px-4 -mt-6 pb-10 max-w-xl mx-auto w-full">
        <form onSubmit={handleGuardar} className="space-y-4">

          {/* Datos del comercio */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/40">
              <Store className="w-4 h-4 text-accent" />
              <p className="font-bold text-foreground text-sm">Datos del comercio</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                  Nombre / Razón social
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm"
                  placeholder="Almacén El Toro"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  Domicilio comercial
                </label>
                <input
                  type="text"
                  value={domicilio}
                  onChange={(e) => setDomicilio(e.target.value)}
                  className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm"
                  placeholder="Av. Corrientes 1234, CABA"
                />
              </div>
            </div>
          </div>

          {/* Datos fiscales */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/40">
              <FileText className="w-4 h-4 text-accent" />
              <p className="font-bold text-foreground text-sm">Datos fiscales</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                  CUIT
                </label>
                <input
                  type="text"
                  value={cuit}
                  onChange={(e) => setCuit(formatCuit(e.target.value))}
                  inputMode="numeric"
                  className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm"
                  placeholder="20-12345678-9"
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
            </div>
          </div>

          {/* Numeración de comprobantes */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/40">
              <Hash className="w-4 h-4 text-accent" />
              <p className="font-bold text-foreground text-sm">Numeración de comprobantes</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                  Punto de venta
                </label>
                <input
                  type="number"
                  value={puntoVenta}
                  onChange={(e) => setPuntoVenta(e.target.value)}
                  min={1}
                  max={9999}
                  className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm"
                />
              </div>

              {/* Preview del próximo comprobante */}
              <div className="bg-secondary rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3">Vista previa del próximo comprobante</p>
                <div className="font-mono text-xs text-foreground space-y-1 border border-border/60 rounded-xl p-4 bg-card">
                  <p className="font-bold text-center text-sm">{nombre || "Mi Comercio"}</p>
                  {domicilio && <p className="text-center text-muted-foreground">{domicilio}</p>}
                  {cuit && <p className="text-center text-muted-foreground">CUIT: {cuit}</p>}
                  <p className="text-center text-muted-foreground">{CONDICIONES_IVA.find(c => c.value === condicionIva)?.label}</p>
                  <div className="border-t border-border my-2" />
                  <p className="text-center font-bold">{tipoComprobante}</p>
                  <p className="text-center text-muted-foreground">N° {pvFormatted}-{lastNum.replace(/^0+/, "") ? String(parseInt(lastNum) + 1).padStart(8, "0") : "00000001"}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando || !nombre.trim()}
            className="w-full bg-accent text-accent-foreground font-bold py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_oklch(0.49_0.12_165/0.2)] flex items-center justify-center gap-2"
          >
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : guardado ? (
              <><CheckCircle2 className="w-4 h-4" /> ¡Guardado!</>
            ) : (
              <>
                <Settings className="w-4 h-4" /> Guardar cambios
              </>
            )}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
