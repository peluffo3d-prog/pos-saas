"use client"

import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react"
import type { StockItem } from "@/lib/store"
import { categoriaColor } from "./category-tabs"

export type CarritoItem = { producto: StockItem; cantidad: number }

type Props = {
  items: CarritoItem[]
  total: number
  onChangeQty: (id: number, delta: number) => void
  onRemove: (id: number) => void
  onClear: () => void
  onCobrar: () => void
}

export function Cart({ items, total, onChangeQty, onRemove, onClear, onCobrar }: Props) {
  const empty = items.length === 0
  return (
    <div className="flex flex-col h-full">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-accent" />
          <p className="font-bold text-sm">Carrito</p>
          <span className="text-xs text-muted-foreground">
            {items.reduce((a, i) => a + i.cantidad, 0)} ítems
          </span>
        </div>
        {!empty && (
          <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 transition-colors">
            Limpiar
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {empty ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12 px-4">
            <ShoppingCart className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">Tocá un producto para agregarlo</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((it) => {
              const gradient = categoriaColor(it.producto.categoria ?? "Otros")
              return (
                <li key={it.producto.id} className="p-3 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm overflow-hidden"
                    style={{ background: gradient }}
                  >
                    {it.producto.imagenUrl
                      ? <img src={it.producto.imagenUrl} alt="" className="w-full h-full object-cover" />
                      : it.producto.producto.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{it.producto.producto}</p>
                    <p className="text-xs text-muted-foreground">${it.producto.precioVenta.toLocaleString("es-AR")} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => onChangeQty(it.producto.id, -1)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-border active:scale-95 transition-colors">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{it.cantidad}</span>
                    <button onClick={() => onChangeQty(it.producto.id, 1)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-border active:scale-95 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-bold text-accent text-sm w-[68px] text-right shrink-0">
                    ${(it.producto.precioVenta * it.cantidad).toLocaleString("es-AR")}
                  </p>
                  <button onClick={() => onRemove(it.producto.id)} className="text-muted-foreground hover:text-destructive p-1 shrink-0 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-border p-4 bg-secondary/30 shrink-0">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total</span>
          <span className="text-3xl font-bold text-accent">${total.toLocaleString("es-AR")}</span>
        </div>
        <button
          onClick={onCobrar}
          disabled={empty}
          className="w-full h-16 rounded-2xl bg-accent text-accent-foreground font-bold text-xl tracking-wide shadow-lg hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {empty ? "COBRAR" : `COBRAR $${total.toLocaleString("es-AR")}`}
        </button>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          F2 Efectivo · F3 Transferencia · F4 Mixto · Esc Cancelar
        </p>
      </footer>
    </div>
  )
}
