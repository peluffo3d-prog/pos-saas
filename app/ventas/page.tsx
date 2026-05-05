"use client"

import { useState, useEffect, useCallback } from "react"
import { Package, BarChart3, Trash2, Menu, X, Home, Download, Wallet } from "lucide-react"
import * as XLSX from "xlsx"
import { getVentas, eliminarVenta, getStock, getTotalesHoy, type Venta } from "@/lib/store"

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [totalesHoy, setTotalesHoy] = useState({ totalVentas: 0, totalCostos: 0, totalGanancias: 0, cantidadVentas: 0 })
  const [valorStock, setValorStock] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [stockBajos, setStockBajos] = useState(0)

  const cargarDatos = useCallback(async () => {
    const [v, totales, stock] = await Promise.all([getVentas(), getTotalesHoy(), getStock()])
    setVentas(v)
    setTotalesHoy(totales)
    setValorStock(stock.reduce((acc, item) => acc + item.precioVenta * item.cantidad, 0))
    setStockBajos(stock.filter((p) => p.cantidad <= 5).length)
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
      <main className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <button onClick={() => setMenuOpen(!menuOpen)} className="absolute left-4 top-4 p-2 rounded-lg hover:bg-secondary transition-colors z-50" aria-label="Abrir menu">
        {menuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-14 w-64 bg-card border border-border rounded-xl shadow-2xl z-40">
          <nav className="flex flex-col py-2">
            <a href="/" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors">
              <Home className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Inicio</span>
            </a>
            <a href="/stock" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors">
              <Package className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Stock</span>
              {stockBajos > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">{stockBajos}</span>
              )}
            </a>
            <a href="/caja" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors">
              <Wallet className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Caja</span>
            </a>
          </nav>
        </div>
      )}

      <div className="absolute right-4 top-4 bg-success text-success-foreground rounded-xl px-4 py-2 text-center min-w-[90px] shadow-lg">
        <p className="text-xs uppercase opacity-80 tracking-wide">Hoy</p>
        <p className="text-lg font-bold">${totalesHoy.totalVentas.toLocaleString("es-AR")}</p>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
          </div>
          {ventas.length > 0 && (
            <button onClick={exportarExcel} className="flex items-center gap-2 bg-secondary hover:bg-border text-foreground px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Download className="w-4 h-4" />Excel
            </button>
          )}
        </div>

        <div className="w-full max-w-xl">
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xs uppercase text-muted-foreground font-semibold mb-1 tracking-wide">Total</p>
              <p className="text-xl font-bold text-success">${totalVentasGeneral.toLocaleString("es-AR")}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xs uppercase text-muted-foreground font-semibold mb-1 tracking-wide">Costo</p>
              <p className="text-xl font-bold text-destructive">${totalCostos.toLocaleString("es-AR")}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xs uppercase text-muted-foreground font-semibold mb-1 tracking-wide">Ganancia</p>
              <p className={`text-xl font-bold ${totalGanancias >= 0 ? "text-info" : "text-destructive"}`}>${totalGanancias.toLocaleString("es-AR")}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Historial</p>
            {ventas.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Sin ventas registradas</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {ventas.map((venta) => {
                  const metodoPagoBadge = () => {
                    if (!venta.metodoPago) return null
                    if (venta.metodoPago === "efectivo") return <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">Efectivo</span>
                    if (venta.metodoPago === "transferencia") return <span className="text-xs px-2 py-0.5 rounded-full bg-info/20 text-info font-medium">Transferencia</span>
                    if (venta.metodoPago === "mixto") return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">Mixto: ${venta.montoEfectivo?.toLocaleString("es-AR")} / ${venta.montoTransferencia?.toLocaleString("es-AR")}</span>
                    return null
                  }
                  return (
                    <div key={venta.id} className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{venta.producto} <span className="text-muted-foreground font-normal">x{venta.cantidad}</span></p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <p className="text-xs text-muted-foreground">{venta.fecha}</p>
                          {metodoPagoBadge()}
                        </div>
                      </div>
                      <div className="text-right mr-3">
                        <p className="font-bold text-success">${venta.totalVenta.toLocaleString("es-AR")}</p>
                        <p className="text-xs text-muted-foreground">+${venta.ganancia.toLocaleString("es-AR")}</p>
                      </div>
                      <button onClick={() => handleEliminarVenta(venta.id)} className="text-muted-foreground hover:text-destructive p-1 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
