"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Minus, Download, X, Loader2, TrendingUp } from "lucide-react"
import * as XLSX from "xlsx"
import { getStock, eliminarProductoStock, ajustarCantidadStock, agregarProductoStock, type StockItem } from "@/lib/store"
import { AppShell } from "@/components/app-shell"

export default function StockPage() {
  const [producto, setProducto] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [precioCosto, setPrecioCosto] = useState("")
  const [precioVenta, setPrecioVenta] = useState("")
  const [historial, setHistorial] = useState<StockItem[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const cargarStock = useCallback(async () => {
    const data = await getStock()
    setHistorial(data)
  }, [])

  useEffect(() => {
    cargarStock().then(() => setMounted(true))
  }, [cargarStock])

  const mostrarToast = (mensaje: string) => {
    setToast(mensaje)
    setTimeout(() => setToast(null), 2800)
  }

  const agregarStock = async () => {
    if (!producto.trim() || !cantidad.trim() || !precioCosto.trim() || !precioVenta.trim()) return
    const nuevoStock = await agregarProductoStock({
      producto: producto.trim(),
      cantidad: parseInt(cantidad),
      precioCosto: parseFloat(precioCosto),
      precioVenta: parseFloat(precioVenta),
    })
    setHistorial(nuevoStock)
    setProducto("")
    setCantidad("")
    setPrecioCosto("")
    setPrecioVenta("")
    setSheetOpen(false)
    mostrarToast("Producto agregado")
  }

  const eliminarItem = async (id: number) => {
    const nuevoHistorial = await eliminarProductoStock(id)
    setHistorial(nuevoHistorial)
    mostrarToast("Producto eliminado")
  }

  const ajustarStock = async (id: number, delta: number) => {
    const item = historial.find((i) => i.id === id)
    if (!item) return
    const nuevaCantidad = Math.max(0, item.cantidad + delta)
    await ajustarCantidadStock(id, nuevaCantidad)
    setHistorial((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad: nuevaCantidad } : i)))
  }

  const getBorderColor = (cantidad: number) => {
    if (cantidad <= 0) return "border-l-destructive"
    if (cantidad <= 5) return "border-l-warning"
    return "border-l-accent"
  }

  const getMargen = (costo: number, venta: number) => {
    if (venta <= 0) return 0
    return Math.round(((venta - costo) / venta) * 100)
  }

  const valorTotalStock = historial.reduce((acc, item) => acc + item.precioVenta * item.cantidad, 0)
  const costoTotalStock = historial.reduce((acc, item) => acc + item.precioCosto * item.cantidad, 0)
  const margenPromedio = valorTotalStock > 0 ? Math.round(((valorTotalStock - costoTotalStock) / valorTotalStock) * 100) : 0

  const exportarExcel = () => {
    const datosExcel = historial.map((item) => ({
      Producto: item.producto,
      Cantidad: item.cantidad,
      "Precio Costo": item.precioCosto,
      "Precio Venta": item.precioVenta,
      "Ganancia Unitaria": item.precioVenta - item.precioCosto,
      "Valor Total (Venta)": item.precioVenta * item.cantidad,
      "Valor Total (Costo)": item.precioCosto * item.cantidad,
    }))
    datosExcel.push({
      Producto: "TOTALES",
      Cantidad: historial.reduce((acc, item) => acc + item.cantidad, 0),
      "Precio Costo": 0,
      "Precio Venta": 0,
      "Ganancia Unitaria": 0,
      "Valor Total (Venta)": valorTotalStock,
      "Valor Total (Costo)": costoTotalStock,
    })
    const ws = XLSX.utils.json_to_sheet(datosExcel)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Stock")
    ws["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
    const fecha = new Date().toLocaleDateString("es-AR").replace(/\//g, "-")
    XLSX.writeFile(wb, `stock_${fecha}.xlsx`)
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
          <h1 className="font-display font-bold text-foreground text-lg">Stock</h1>
          <div className="flex items-center gap-2">
            {historial.length > 0 && (
              <button onClick={exportarExcel} className="flex items-center gap-1.5 bg-secondary hover:bg-border text-foreground px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                <Download className="w-3.5 h-3.5" />Excel
              </button>
            )}
            <button onClick={() => setSheetOpen(true)} className="flex items-center gap-1.5 bg-accent text-accent-foreground px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all">
              <Plus className="w-3.5 h-3.5" />Agregar
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-xl mx-auto w-full">
        {/* Summary bar */}
        {historial.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground">{historial.length}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mt-0.5">Productos</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-accent">${valorTotalStock.toLocaleString("es-AR")}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mt-0.5">Valor stock</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
                <p className="text-lg font-bold text-accent">{margenPromedio}%</p>
              </div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mt-0.5">Margen</p>
            </div>
          </div>
        )}

        {/* Stock list */}
        {historial.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm mb-3">No hay productos en stock</p>
            <button onClick={() => setSheetOpen(true)} className="bg-accent text-accent-foreground px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
              Agregar primer producto
            </button>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {historial.map((item) => {
              const margen = getMargen(item.precioCosto, item.precioVenta)
              return (
                <div
                  key={item.id}
                  className={`bg-card border border-border border-l-4 ${getBorderColor(item.cantidad)} rounded-xl p-4`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-bold text-foreground text-sm truncate">{item.producto}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          Costo ${item.precioCosto.toLocaleString("es-AR")}
                        </span>
                        <span className="text-xs text-foreground font-semibold">
                          Venta ${item.precioVenta.toLocaleString("es-AR")}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${margen >= 30 ? "bg-accent/20 text-accent" : margen >= 15 ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"}`}>
                          {margen}% margen
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => ajustarStock(item.id, -1)} className="w-8 h-8 bg-secondary border border-border rounded-lg flex items-center justify-center hover:bg-border transition-colors active:scale-95">
                        <Minus className="w-4 h-4 text-foreground" />
                      </button>
                      <span className="font-bold text-lg min-w-[32px] text-center text-foreground">{item.cantidad}</span>
                      <button onClick={() => ajustarStock(item.id, 1)} className="w-8 h-8 bg-secondary border border-border rounded-lg flex items-center justify-center hover:bg-border transition-colors active:scale-95">
                        <Plus className="w-4 h-4 text-foreground" />
                      </button>
                      <span className="text-xs text-muted-foreground ml-1">unidades</span>
                    </div>
                    <button onClick={() => eliminarItem(item.id)} className="text-muted-foreground hover:text-destructive p-2 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom sheet agregar producto */}
      {sheetOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end z-50" onClick={(e) => e.target === e.currentTarget && setSheetOpen(false)}>
          <div className="bg-card border-t border-border w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-lg font-bold text-foreground">Agregar producto</h2>
              <button onClick={() => setSheetOpen(false)} className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-muted-foreground hover:bg-border transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Nombre del producto", value: producto, setter: setProducto, type: "text", placeholder: "Ej: Coca Cola 500ml", autoComplete: "off" },
                { label: "Precio de venta", value: precioVenta, setter: setPrecioVenta, type: "number", placeholder: "0" },
                { label: "Costo unitario", value: precioCosto, setter: setPrecioCosto, type: "number", placeholder: "0" },
                { label: "Stock inicial", value: cantidad, setter: setCantidad, type: "number", placeholder: "0" },
              ].map(({ label, value, setter, type, placeholder, autoComplete }) => (
                <div key={label}>
                  <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">{label}</label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    min={type === "number" ? "0" : undefined}
                    step={type === "number" && label !== "Stock inicial" ? "0.01" : undefined}
                  />
                </div>
              ))}

              {/* Margin preview */}
              {precioCosto && precioVenta && Number(precioVenta) > 0 && (
                <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Margen calculado</span>
                  <span className="text-accent font-bold">{getMargen(Number(precioCosto), Number(precioVenta))}%</span>
                </div>
              )}

              <button
                onClick={agregarStock}
                disabled={!producto.trim() || !cantidad.trim() || !precioCosto.trim() || !precioVenta.trim()}
                className="w-full bg-accent text-accent-foreground font-bold py-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all text-sm"
              >
                Guardar producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 right-4 bg-card text-foreground border border-accent px-4 py-3 rounded-xl shadow-2xl z-50 font-semibold text-sm">
          {toast}
        </div>
      )}
    </AppShell>
  )
}
