"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Package, Trash2, Minus, Menu, X, BarChart3, Home, Download, Wallet, AlertTriangle } from "lucide-react"
import * as XLSX from "xlsx"
import { getStock, eliminarProductoStock, ajustarCantidadStock, agregarProductoStock, getCantidadProductosBajos, type StockItem } from "@/lib/store"

export default function StockPage() {
  const [producto, setProducto] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [precioCosto, setPrecioCosto] = useState("")
  const [precioVenta, setPrecioVenta] = useState("")
  const [historial, setHistorial] = useState<StockItem[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [stockBajos, setStockBajos] = useState(0)

  const cargarStock = useCallback(async () => {
    const data = await getStock()
    setHistorial(data)
    setStockBajos(data.filter((p) => p.cantidad <= 5).length)
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
    setHistorial((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad: nuevaCantidad } : i))
    )
  }

  const getBadgeStock = (cantidad: number) => {
    if (cantidad <= 0) return { clase: "bg-destructive/20 text-destructive", texto: "Agotado" }
    if (cantidad <= 5) return { clase: "bg-warning/20 text-warning", texto: "Bajo" }
    return { clase: "bg-success/20 text-success", texto: "OK" }
  }

  const valorTotalStock = historial.reduce((acc, item) => acc + item.precioVenta * item.cantidad, 0)
  const costoTotalStock = historial.reduce((acc, item) => acc + item.precioCosto * item.cantidad, 0)

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
            <a href="/ventas" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors">
              <BarChart3 className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Ventas</span>
            </a>
            <a href="/caja" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors">
              <Wallet className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Caja</span>
            </a>
          </nav>
        </div>
      )}

      <div className="absolute right-4 top-4 bg-info text-info-foreground rounded-xl px-4 py-2 text-center min-w-[90px] shadow-lg">
        <p className="text-xs uppercase opacity-80 tracking-wide">Valor</p>
        <p className="text-lg font-bold">${valorTotalStock.toLocaleString("es-AR")}</p>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Stock</h1>
          </div>
          {historial.length > 0 && (
            <button onClick={exportarExcel} className="flex items-center gap-2 bg-secondary hover:bg-border text-foreground px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Download className="w-4 h-4" />Excel
            </button>
          )}
        </div>

        <button onClick={() => setSheetOpen(true)} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 mb-6 hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />Agregar producto
        </button>

        {stockBajos > 0 && (
          <div className="w-full max-w-xl mb-4 flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning">
                {stockBajos} producto{stockBajos > 1 ? "s" : ""} con stock bajo
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {historial.filter((p) => p.cantidad <= 5).map((p) =>
                  p.cantidad === 0 ? `${p.producto} (agotado)` : `${p.producto} (${p.cantidad} uds)`
                ).join(" · ")}
              </p>
            </div>
          </div>
        )}

        <div className="w-full max-w-xl">
          {historial.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sin productos en stock</p>
          ) : (
            <div className="space-y-3">
              {historial.map((item) => {
                const badge = getBadgeStock(item.cantidad)
                return (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-foreground">{item.producto}</p>
                        <p className="text-sm text-muted-foreground">Costo: ${item.precioCosto.toLocaleString("es-AR")} | Venta: ${item.precioVenta.toLocaleString("es-AR")}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${badge.clase}`}>{badge.texto}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => ajustarStock(item.id, -1)} className="w-8 h-8 bg-secondary border border-border rounded-lg flex items-center justify-center font-bold hover:bg-border transition-colors">
                          <Minus className="w-4 h-4 text-foreground" />
                        </button>
                        <span className="font-bold text-lg min-w-[32px] text-center text-foreground">{item.cantidad}</span>
                        <button onClick={() => ajustarStock(item.id, 1)} className="w-8 h-8 bg-secondary border border-border rounded-lg flex items-center justify-center font-bold hover:bg-border transition-colors">
                          <Plus className="w-4 h-4 text-foreground" />
                        </button>
                      </div>
                      <button onClick={() => eliminarItem(item.id)} className="text-muted-foreground hover:text-destructive p-2 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50" onClick={(e) => e.target === e.currentTarget && setSheetOpen(false)}>
          <div className="bg-card border-t border-border w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-foreground">Agregar producto</h2>
              <button onClick={() => setSheetOpen(false)} className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-muted-foreground hover:bg-border transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Nombre", value: producto, setter: setProducto, type: "text", placeholder: "Ej: Coca 2L", autoComplete: "off" },
                { label: "Precio de venta", value: precioVenta, setter: setPrecioVenta, type: "number", placeholder: "0" },
                { label: "Costo unitario", value: precioCosto, setter: setPrecioCosto, type: "number", placeholder: "0" },
                { label: "Stock inicial", value: cantidad, setter: setCantidad, type: "number", placeholder: "0" },
              ].map(({ label, value, setter, type, placeholder, autoComplete }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1 tracking-wide">{label}</label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full border border-border bg-muted text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    min={type === "number" ? "0" : undefined}
                    step={type === "number" && label !== "Stock inicial" ? "0.01" : undefined}
                  />
                </div>
              ))}
              <button
                onClick={agregarStock}
                disabled={!producto.trim() || !cantidad.trim() || !precioCosto.trim() || !precioVenta.trim()}
                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                Guardar producto
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-card text-foreground border border-success px-5 py-3 rounded-xl shadow-2xl z-50 font-semibold">
          {toast}
        </div>
      )}
    </main>
  )
}
