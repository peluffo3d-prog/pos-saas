"use client"

import type { StockItem } from "@/lib/store"
import { categoriaColor } from "./category-tabs"

type Props = {
  productos: StockItem[]
  onSelect: (p: StockItem) => void
  compact?: boolean
}

export function ProductGrid({ productos, onSelect, compact = false }: Props) {
  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"}`}>
      {productos.map((p) => {
        const sinStock  = p.cantidad <= 0
        const pocoStock = !sinStock && p.cantidad <= 5
        const cat       = p.categoria ?? "Otros"
        const gradient  = categoriaColor(cat)

        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            disabled={sinStock}
            className={`group relative flex flex-col rounded-2xl border-2 bg-card text-left overflow-hidden transition-all active:scale-[0.97] ${
              sinStock
                ? "opacity-40 cursor-not-allowed border-border"
                : "border-border hover:border-accent hover:shadow-md cursor-pointer"
            }`}
          >
            {/* Imagen o avatar */}
            <div
              className={`w-full flex items-center justify-center overflow-hidden text-white font-bold ${compact ? "aspect-square text-2xl" : "aspect-square text-3xl"}`}
              style={{ background: gradient }}
            >
              {p.imagenUrl ? (
                <img src={p.imagenUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="select-none">{p.producto.charAt(0).toUpperCase()}</span>
              )}
            </div>

            {/* Badge stock */}
            {(sinStock || pocoStock) && (
              <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                sinStock ? "bg-destructive text-destructive-foreground" : "bg-warning/90 text-foreground"
              }`}>
                {sinStock ? "Agotado" : `${p.cantidad}`}
              </span>
            )}

            {/* Info */}
            <div className={`flex-1 flex flex-col justify-between gap-0.5 ${compact ? "p-2" : "p-3"}`}>
              <p className={`font-semibold text-foreground line-clamp-2 leading-tight ${compact ? "text-xs" : "text-sm"}`}>
                {p.producto}
              </p>
              <p className={`font-bold text-accent ${compact ? "text-sm" : "text-base"}`}>
                ${p.precioVenta.toLocaleString("es-AR")}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
