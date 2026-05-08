"use client"

import { useState, useEffect, useCallback } from "react"
import { Trash2, Download, Loader2, BarChart3, TrendingUp, ShoppingBag, DollarSign } from "lucide-react"
import * as XLSX from "xlsx"
import { getVentas, eliminarVenta, getTotalesHoy, type Venta } from "@/lib/store"
import { AppShell } from "@/components/app-shell"

const metodoBadge = (v: Venta) => {
  if (!v.metodoPago) return null
  if (v.metodoPago === "efectivo")
    return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-bold uppercase tracking-wide">Efectivo</span>
  if (v.metodoPago === "transferencia")
    return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[oklch(0.55_0.15_230/0.15)] text-[oklch(0.45_0.15_230)] font-bold uppercase tracking-wide">Transfer.</span>
  if (v.metodoPago === "mercadopago")
    return <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide" style={{ backgroundColor: "#009ee315", color: "#009ee3" }}>Mercado Pago</span>
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning-foreground font-bold uppercase tracking-wide">
      Mixto ${v.montoEfectivo?.toLocaleString("es-AR")}/${v.montoTransferencia?.toLocaleString("es-AR")}
    </span>
  )
}

export default function VentasPage() {
  const [ventas, setVentas]       = useState<Venta[]>([])
  const [totales, setTotales]     = useState({ totalVentas: 0, totalCostos: 0, totalGanancias: 0, cantidadVentas: 0 })
  const [mounted, setMounted]     = useState(false)

  const cargarDatos = useCallback(async () => {
    const [v, t] = await Promise.all([getVentas(), getTotalesHoy()])
    setVentas(v)
    setTotales(t)
  }, [])

  useEffect(() => { cargarDatos().then(() => setMounted(true)) }, [cargarDatos])

  const handleEliminar = async (id: number) => {
    await eliminarVenta(id)
    await cargarDatos()
  }

  const exportarExcel = () => {
    const rows = ventas.map((v) => ({
      Producto: v.producto,
      Cantidad: v.cantidad,
      "Total Venta": v.totalVenta,
      Costo: v.costo,
      Ganancia: v.ganancia,
      Fecha: v.fecha,
      "Método de Pago": v.metodoPago === "mixto"
        ? `Mixto (Ef $${v.montoEfectivo} / Tr $${v.montoTransferencia})`
        : v.metodoPago === "efectivo" ? "Efectivo"
        : v.metodoPago === "transferencia" ? "Transferencia" : "",
    }))
    rows.push({
      Producto: "TOTALES", Cantidad: ventas.reduce((a, v) => a + v.cantidad, 0),
      "Total Venta": totales.totalVentas, Costo: totales.totalCostos,
      Ganancia: totales.totalGanancias, Fecha: "", "Método de Pago": "",
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Ventas")
    ws["!cols"] = [20, 10, 14, 12, 12, 20, 32].map((wch) => ({ wch }))
    XLSX.writeFile(wb, `ventas_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.xlsx`)
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    )
  }

  const margen = totales.totalVentas > 0
    ? Math.round((totales.totalGanancias / totales.totalVentas) * 100)
    : 0

  return (
    <AppShell>
      {/* Hero verde */}
      <div className="bg-accent px-5 pt-8 pb-12">
        <div className="max-w-xl mx-auto">
          <p className="text-accent-foreground/70 text-sm mb-1">Ventas no archivadas</p>
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-display font-bold text-accent-foreground text-xl">Historial de Ventas</h1>
            {ventas.length > 0 && (
              <button
                onClick={exportarExcel}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-accent-foreground px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
            )}
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: ShoppingBag, label: "Ventas", value: totales.cantidadVentas, prefix: "", isNumber: true },
              { icon: DollarSign, label: "Recaudado", value: totales.totalVentas, prefix: "$", isNumber: false },
              { icon: TrendingUp, label: `Ganancia (${margen}%)`, value: totales.totalGanancias, prefix: "$", isNumber: false },
            ].map(({ icon: Icon, label, value, prefix, isNumber }) => (
              <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-3">
                <Icon className="w-4 h-4 text-accent-foreground/60 mb-1.5" />
                <p className="text-accent-foreground font-bold text-lg leading-none">
                  {prefix}{isNumber ? value : (value as number).toLocaleString("es-AR")}
                </p>
                <p className="text-accent-foreground/60 text-[10px] font-semibold uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-4 -mt-6 pb-10 max-w-xl mx-auto w-full">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {ventas.length} venta{ventas.length !== 1 ? "s" : ""}
            </p>
            {ventas.length > 0 && (
              <p className="text-[10px] text-muted-foreground">Se archivan al cerrar caja</p>
            )}
          </div>

          {ventas.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">Sin ventas registradas hoy</p>
              <p className="text-muted-foreground text-sm">Las ventas del día aparecen aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ventas.map((v) => (
                <div key={v.id} className="flex items-center px-5 py-4 gap-3 hover:bg-secondary/30 transition-colors">
                  {/* Ícono categoría */}
                  <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-accent" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      {v.producto}
                      <span className="text-muted-foreground font-normal"> ×{v.cantidad}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <p className="text-xs text-muted-foreground">{v.fecha}</p>
                      {metodoBadge(v)}
                    </div>
                  </div>

                  <div className="text-right shrink-0 mr-1">
                    <p className="font-bold text-accent text-sm">${v.totalVenta.toLocaleString("es-AR")}</p>
                    <p className="text-[10px] text-muted-foreground">+${v.ganancia.toLocaleString("es-AR")}</p>
                  </div>

                  <button
                    onClick={() => handleEliminar(v.id)}
                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Total a pie de lista */}
          {ventas.length > 0 && (
            <div className="px-5 py-4 border-t border-border bg-secondary/40 flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total</p>
              <p className="font-bold text-foreground text-lg">${totales.totalVentas.toLocaleString("es-AR")}</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
