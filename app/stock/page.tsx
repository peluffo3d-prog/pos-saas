"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Trash2, Minus, Download, Upload, X, Loader2, TrendingUp, Package, Camera, ChevronDown } from "lucide-react"
import * as XLSX from "xlsx"
import {
  getStock, eliminarProductoStock, ajustarCantidadStock, agregarProductoStock,
  subirImagenProducto, actualizarImagenProducto,
  type StockItem,
} from "@/lib/store"
import { CATEGORIAS_KIOSCO, type CategoriaKiosco } from "@/lib/catalogos/kiosco"
import { AppShell } from "@/components/app-shell"

export default function StockPage() {
  const [producto, setProducto]       = useState("")
  const [cantidad, setCantidad]       = useState("")
  const [precioCosto, setCosto]       = useState("")
  const [precioVenta, setVenta]       = useState("")
  const [categoria, setCategoria]     = useState<CategoriaKiosco>("Otros")
  const [imagenFile, setImagenFile]   = useState<File | null>(null)
  const [imagenPreview, setPreview]   = useState<string | null>(null)
  const [historial, setHistorial]     = useState<StockItem[]>([])
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null)
  const [mounted, setMounted]         = useState(false)
  const [subiendoFoto, setSub]        = useState<number | null>(null)
  const [importando, setImportando]   = useState(false)

  const fileInputRef    = useRef<HTMLInputElement>(null)
  const fotoEditRef     = useRef<HTMLInputElement>(null)
  const importInputRef  = useRef<HTMLInputElement>(null)
  const productoEditId  = useRef<number | null>(null)

  const cargarStock = useCallback(async () => {
    const data = await getStock()
    setHistorial(data)
  }, [])

  useEffect(() => {
    cargarStock().then(() => setMounted(true))
  }, [cargarStock])

  const toast_ = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }

  // ─── Imagen en el form ───────────────────────────────────────────────────────

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagenFile(file)
    setPreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  const quitarImagen = () => {
    setImagenFile(null)
    setPreview(null)
  }

  // ─── Agregar producto ────────────────────────────────────────────────────────

  const agregarStock = async () => {
    if (!producto.trim() || !cantidad.trim() || !precioCosto.trim() || !precioVenta.trim()) return

    const nuevoStock = await agregarProductoStock({
      producto: producto.trim(),
      cantidad: parseInt(cantidad),
      precioCosto: parseFloat(precioCosto),
      precioVenta: parseFloat(precioVenta),
      categoria,
    })

    // Si se eligió imagen, subir ahora
    if (imagenFile) {
      const creado = nuevoStock.find(
        (p) => p.producto.toLowerCase() === producto.trim().toLowerCase()
      )
      if (creado) {
        const url = await subirImagenProducto(creado.id, imagenFile)
        if (url) {
          await actualizarImagenProducto(creado.id, url)
          const refreshed = await getStock()
          setHistorial(refreshed)
        } else {
          setHistorial(nuevoStock)
        }
      } else {
        setHistorial(nuevoStock)
      }
    } else {
      setHistorial(nuevoStock)
    }

    setProducto(""); setCantidad(""); setCosto(""); setVenta(""); setCategoria("Otros")
    quitarImagen()
    setSheetOpen(false)
    toast_("Producto agregado al stock")
  }

  // ─── Foto en producto existente ──────────────────────────────────────────────

  const abrirFotoEdit = (id: number) => {
    productoEditId.current = id
    fotoEditRef.current?.click()
  }

  const handleFotoEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const id   = productoEditId.current
    if (!file || !id) return
    e.target.value = ""

    setSub(id)
    const url = await subirImagenProducto(id, file)
    if (url) {
      await actualizarImagenProducto(id, url)
      setHistorial((prev) => prev.map((i) => i.id === id ? { ...i, imagenUrl: url } : i))
      toast_("Foto actualizada")
    } else {
      toast_("No se pudo subir la foto", false)
    }
    setSub(null)
    productoEditId.current = null
  }

  // ─── Otras acciones ──────────────────────────────────────────────────────────

  const eliminarItem = async (id: number) => {
    const nuevo = await eliminarProductoStock(id)
    setHistorial(nuevo)
    toast_("Producto eliminado")
  }

  const ajustarStock = async (id: number, delta: number) => {
    const item = historial.find((i) => i.id === id)
    if (!item) return
    const nueva = Math.max(0, item.cantidad + delta)
    await ajustarCantidadStock(id, nueva)
    setHistorial((prev) => prev.map((i) => i.id === id ? { ...i, cantidad: nueva } : i))
  }

  const getStockStatus = (cantidad: number) => {
    if (cantidad <= 0) return { border: "border-l-destructive", badge: "bg-destructive/10 text-destructive", label: "Sin stock" }
    if (cantidad <= 5) return { border: "border-l-warning",     badge: "bg-warning/15 text-warning-foreground", label: "Poco stock" }
    return                  { border: "border-l-accent",        badge: "bg-accent/10 text-accent",              label: "OK" }
  }

  const getMargen = (costo: number, venta: number) =>
    venta <= 0 ? 0 : Math.round(((venta - costo) / venta) * 100)

  const getMargenBadge = (m: number) =>
    m >= 30 ? "bg-accent/10 text-accent" : m >= 15 ? "bg-warning/15 text-warning-foreground" : "bg-destructive/10 text-destructive"

  const valorTotal   = historial.reduce((a, i) => a + i.precioVenta * i.cantidad, 0)
  const costoTotal   = historial.reduce((a, i) => a + i.precioCosto * i.cantidad, 0)
  const margenProm   = valorTotal > 0 ? Math.round(((valorTotal - costoTotal) / valorTotal) * 100) : 0
  const pocoStock    = historial.filter((i) => i.cantidad <= 5).length

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setImportando(true)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws)

      let importados = 0
      for (const row of rows) {
        const nombre = row["producto"] ?? row["Producto"] ?? row["PRODUCTO"] ?? ""
        const cant   = parseInt(String(row["cantidad"] ?? row["Cantidad"] ?? "1")) || 1
        const costo  = parseFloat(String(row["precio_costo"] ?? row["Precio Costo"] ?? "0")) || 0
        const venta  = parseFloat(String(row["precio_venta"] ?? row["Precio Venta"] ?? "0"))
        const cat    = (row["categoria"] ?? row["Categoria"] ?? "Otros") as CategoriaKiosco
        const imgUrl = row["imagen_url"] ?? row["Imagen URL"] ?? undefined

        if (!nombre.trim() || !venta) continue
        await agregarProductoStock({ producto: nombre.trim(), cantidad: cant, precioCosto: costo, precioVenta: venta, categoria: cat, imagenUrl: imgUrl })
        importados++
      }

      await cargarStock()
      toast_(`✓ ${importados} productos importados`)
    } catch {
      toast_("Error al leer el archivo. Verificá el formato.", false)
    } finally {
      setImportando(false)
    }
  }

  const exportarExcel = () => {
    const rows = historial.map((i) => ({
      Producto: i.producto, Cantidad: i.cantidad,
      "Precio Costo": i.precioCosto, "Precio Venta": i.precioVenta,
      "Ganancia Unitaria": i.precioVenta - i.precioCosto,
      "Valor Total (Venta)": i.precioVenta * i.cantidad,
      "Valor Total (Costo)": i.precioCosto * i.cantidad,
    }))
    rows.push({ Producto: "TOTALES", Cantidad: historial.reduce((a, i) => a + i.cantidad, 0),
      "Precio Costo": 0, "Precio Venta": 0, "Ganancia Unitaria": 0,
      "Valor Total (Venta)": valorTotal, "Valor Total (Costo)": costoTotal })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Stock")
    ws["!cols"] = [20, 10, 14, 14, 18, 18, 18].map((wch) => ({ wch }))
    XLSX.writeFile(wb, `stock_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.xlsx`)
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
      {/* Input oculto para editar foto de producto existente */}
      <input ref={fotoEditRef} type="file" accept="image/*" capture="environment" onChange={handleFotoEdit} className="hidden" />

      {/* Hero */}
      <div className="bg-accent px-5 pt-8 pb-12">
        <div className="max-w-xl mx-auto">
          <p className="text-accent-foreground/70 text-sm mb-1">Tu inventario</p>
          <div className="flex items-end justify-between mb-5">
            <h1 className="font-display font-bold text-accent-foreground text-xl">Stock de productos</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={importando}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-accent-foreground px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {importando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {importando ? "Importando..." : "Importar CSV"}
              </button>
              {historial.length > 0 && (
                <button onClick={exportarExcel} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-accent-foreground px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                  <Download className="w-3.5 h-3.5" /> Excel
                </button>
              )}
            </div>
          </div>
          <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: historial.length, label: "Productos" },
              { val: `$${valorTotal >= 1000 ? `${(valorTotal / 1000).toFixed(0)}k` : valorTotal.toLocaleString("es-AR")}`, label: "Valor stock" },
              { val: `${margenProm}%`, label: "Margen", icon: <TrendingUp className="w-3.5 h-3.5 text-accent-foreground inline mr-1" /> },
            ].map(({ val, label, icon }) => (
              <div key={label} className="bg-white/20 backdrop-blur-sm rounded-2xl px-3 py-3 text-center">
                <p className="text-accent-foreground font-bold text-xl leading-tight">{icon}{val}</p>
                <p className="text-accent-foreground/70 text-[10px] font-semibold uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mt-6">
        <div className="bg-background rounded-t-3xl px-4 pt-4 pb-3 border-b border-border shadow-sm">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground text-sm">
                {historial.length > 0 ? `${historial.length} productos` : "Sin productos aún"}
              </p>
              {pocoStock > 0 && (
                <p className="text-xs text-warning-foreground font-medium">⚠️ {pocoStock} con poco stock</p>
              )}
            </div>
            <button onClick={() => setSheetOpen(true)} className="flex items-center gap-1.5 bg-accent text-accent-foreground px-4 py-2.5 rounded-2xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-6 max-w-xl mx-auto w-full">
        {historial.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-accent/40" />
            </div>
            <p className="text-foreground font-semibold text-sm mb-1">Todavía no hay productos</p>
            <p className="text-muted-foreground text-sm mb-5">Agregá tu primer producto para empezar a controlar el stock</p>
            <button onClick={() => setSheetOpen(true)} className="bg-accent text-accent-foreground px-6 py-3 rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity">
              + Agregar primer producto
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {historial.map((item) => {
              const margen = getMargen(item.precioCosto, item.precioVenta)
              const status = getStockStatus(item.cantidad)
              return (
                <div key={item.id} className={`bg-card border border-border border-l-4 ${status.border} rounded-2xl overflow-hidden shadow-sm`}>
                  <div className="flex gap-3 p-4">
                    {/* Imagen o avatar */}
                    <div className="relative shrink-0">
                      {item.imagenUrl ? (
                        <img src={item.imagenUrl} alt={item.producto} className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-2xl font-bold text-muted-foreground">
                          {item.producto.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Botón cámara sobre la imagen */}
                      <button
                        onClick={() => abrirFotoEdit(item.id)}
                        disabled={subiendoFoto === item.id}
                        className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-all active:scale-90"
                      >
                        {subiendoFoto === item.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Camera className="w-3 h-3" />
                        }
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-bold text-foreground text-sm truncate">{item.producto}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${status.badge}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs text-muted-foreground">Costo ${item.precioCosto.toLocaleString("es-AR")}</span>
                        <span className="text-xs font-semibold text-foreground">Venta ${item.precioVenta.toLocaleString("es-AR")}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${getMargenBadge(margen)}`}>
                          {margen}% margen
                        </span>
                      </div>

                      {/* Controles stock */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => ajustarStock(item.id, -1)} className="w-8 h-8 bg-secondary border border-border rounded-xl flex items-center justify-center hover:bg-border transition-colors active:scale-95">
                            <Minus className="w-3.5 h-3.5 text-foreground" />
                          </button>
                          <span className="font-bold text-lg min-w-[32px] text-center text-foreground">{item.cantidad}</span>
                          <button onClick={() => ajustarStock(item.id, 1)} className="w-8 h-8 bg-secondary border border-border rounded-xl flex items-center justify-center hover:bg-border transition-colors active:scale-95">
                            <Plus className="w-3.5 h-3.5 text-foreground" />
                          </button>
                          <span className="text-xs text-muted-foreground">u.</span>
                        </div>
                        <button onClick={() => eliminarItem(item.id)} className="text-muted-foreground hover:text-destructive p-1.5 transition-colors rounded-xl hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom sheet — agregar producto */}
      {sheetOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50" onClick={(e) => e.target === e.currentTarget && setSheetOpen(false)}>
          <div className="bg-card border-t border-border w-full rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Nuevo producto</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Completá los datos para agregar al stock</p>
              </div>
              <button onClick={() => { setSheetOpen(false); quitarImagen() }} className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-muted-foreground hover:bg-border transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Picker de foto */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Foto del producto <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                </label>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center gap-2 hover:border-accent hover:bg-accent/5 transition-all"
                >
                  {imagenPreview ? (
                    <img src={imagenPreview} alt="Preview" className="w-24 h-24 object-cover rounded-xl" />
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                        <Camera className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Tocá para sacar o elegir una foto</p>
                    </>
                  )}
                </button>
                {imagenPreview && (
                  <button type="button" onClick={quitarImagen} className="text-xs text-muted-foreground mt-1.5 hover:text-destructive transition-colors">
                    Quitar foto
                  </button>
                )}
              </div>

              {/* Campos del producto */}
              {[
                { label: "Nombre del producto", value: producto, set: setProducto, type: "text", placeholder: "Ej: Coca Cola 500ml", autoComplete: "off" },
                { label: "Precio de venta ($)", value: precioVenta, set: setVenta, type: "number", placeholder: "0" },
                { label: "Costo unitario ($)",  value: precioCosto, set: setCosto, type: "number", placeholder: "0" },
                { label: "Cantidad en stock",   value: cantidad,    set: setCantidad, type: "number", placeholder: "0" },
              ].map(({ label, value, set, type, placeholder, autoComplete }) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full border border-border bg-secondary text-foreground rounded-2xl px-4 py-3.5 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    min={type === "number" ? "0" : undefined}
                    step={type === "number" && label !== "Cantidad en stock" ? "0.01" : undefined}
                  />
                </div>
              ))}

              {/* Categoría */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Categoría</label>
                <div className="relative">
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as CategoriaKiosco)}
                    className="w-full border border-border bg-secondary text-foreground rounded-2xl px-4 py-3.5 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm appearance-none pr-10"
                  >
                    {CATEGORIAS_KIOSCO.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Vista previa margen */}
              {precioCosto && precioVenta && Number(precioVenta) > 0 && (
                <div className="bg-accent/10 border border-accent/20 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-foreground font-medium">Margen de ganancia</span>
                  <span className="text-accent font-bold text-lg">{getMargen(Number(precioCosto), Number(precioVenta))}%</span>
                </div>
              )}

              <button
                onClick={agregarStock}
                disabled={!producto.trim() || !cantidad.trim() || !precioCosto.trim() || !precioVenta.trim()}
                className="w-full bg-accent text-accent-foreground font-bold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Guardar producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 right-4 px-4 py-3 rounded-xl shadow-lg z-50 font-semibold text-sm border ${
          toast.ok ? "bg-accent text-accent-foreground border-accent" : "bg-card text-foreground border-destructive"
        }`}>
          {toast.msg}
        </div>
      )}
    </AppShell>
  )
}
