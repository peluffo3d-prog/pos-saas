"use client"

import { useState, useEffect, useCallback } from "react"
import { Trash2, Download, Loader2, BarChart3 } from "lucide-react"
import * as XLSX from "xlsx"
import { getVentas, eliminarVenta, getStock, getTotalesHoy, type Venta } from "@/lib/store"
import { AppShell } from "@/components/app-shell"

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [totalesHoy, setTotalesHoy] = useState({ totalVentas: 0, totalCostos: 0, totalGanancias: 0, cantidadVentas: 0 })
  const [mounted, setMounted] = useState(false)

  const cargarDatos = useCallback(async () => {
    const [v, totales, stock] = await Promise.all([getVentas(), getTotalesHoy(), getStock()])
    setVentas(v)
    setTotalesHoy(totales)
    // stock used only to trigger fetch for side effects
    void stock
  }, [])

  useEffect(() => {
    cargarDatos().then(() => setMounted(true))
  }, [cargarDatos])

  const handleEliminarVenta = async (id: number) => {
    await eliminarVenta(id)
    await cargarDatos()
  }

  const totalGanancias = ventas.reduce((acc, v) => acc + v.ganancia, 0)
  const totalVentasGeneral = ventas.reduce((acc, v) => acc + v.totalVenta, 0)
  const totalCostos = ventas.reduce((acc, v) => acc + v.costo, 0)

  const exportarExcel = () => {
    const datosExcel = ventas.map((v) => ({
      Producto: v.producto,
      Cantidad: v.cantidad,
      "Total Venta": v.totalVenta,
      Costo: v.costo,
      Ganancia: v.ganancia,
      Fecha: v.fecha,
      "Metodo de Pago": v.metodoPago === "mixto"
        ? `Mixto (Efectivo: $${v.montoEfectivo}, Transfer: $${v.montoTransferencia})`
        : v.metodoPago === "efectivo" ? "Efectivo" : v.metodoPago === "transferencia" ? "Transferencia" : "N/A",
    }))
    datosExcel.push({
      Producto: "TOTALES",
      Cantidad: ventas.reduce((acc, v) => acc + v.cantidad, 0),
      "Total Venta": totalVentasGeneral,
      Costo: totalCostos,
      Ganancia: totalGanancias,
      Fecha: "",
      "Metodo de Pago": "",
    })
    const ws = XLSX.utils.json_to_sheet(datosExcel)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Ventas")
    ws["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 30 }]
    const fecha = new Date().toLocaleDateString("es-AR").replace(/\//g, "-")
    XLSX.writeFile(wb, `ventas_${fecha}.xlsx`)
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <h1 className="font-display font-bold text-foreground text-lg">Historial de Ventas</h1>
          {ventas.length > 0 && (
            <button onClick={exportarExcel} className="flex items-center gap-1.5 bg-secondary hover:bg-border text-foreground px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
              <Download className="w-3.5 h-3.5" />Excel
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-xl mx-auto w-full">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-accent">${totalVentasGeneral.toLocaleString("es-AR")}</p>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mt-0.5">Total</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-destructive">${totalCostos.toLocaleString("es-AR")}</p>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mt-0.5">Costos</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className={`text-lg font-bold ${totalGanancias >= 0 ? "text-accent" : "text-destructive"}`}>${totalGanancias.toLocaleString("es-AR")}</p>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mt-0.5">Ganancia</p>
          </div>
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Historial</p>
          </div>
          {ventas.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">Sin ventas registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {ventas.map((venta) => {
                const metodoPagoBadge = () => {
                  if (!venta.metodoPago) return null
                  if (venta.metodoPago === "efectivo") return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">Efectivo</span>
                  if (venta.metodoPago === "transferencia") return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-info/20 text-info font-semibold">Transferencia</span>
                  if (venta.metodoPago === "mixto") return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-semibold">Mixto: ${venta.montoEfectivo?.toLocaleString("es-AR")} / ${venta.montoTransferencia?.toLocaleString("es-AR")}</span>
                  return null
                }
                return (
                  <div key={venta.id} className="flex items-center p-4 gap-3 hover:bg-secondary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">
                        {venta.producto} <span className="text-muted-foreground font-normal">x{venta.cantidad}</span>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <p className="text-xs text-muted-foreground">{venta.fecha}</p>
                        {metodoPagoBadge()}
                      </div>
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      <p className="font-bold text-accent text-sm">${venta.totalVenta.toLocaleString("es-AR")}</p>
                      <p className="text-xs text-muted-foreground">+${venta.ganancia.toLocaleString("es-AR")}</p>
                    </div>
                    <button onClick={() => handleEliminarVenta(venta.id)} className="text-muted-foreground hover:text-destructive p-1 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
