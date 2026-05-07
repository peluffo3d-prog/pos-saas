"use client"

import { CATEGORIAS_KIOSCO, type CategoriaKiosco } from "@/lib/catalogos/kiosco"

export type CategoriaActiva = "Todas" | CategoriaKiosco

const CATEGORIAS_TABS: CategoriaActiva[] = ["Todas", ...CATEGORIAS_KIOSCO]

const COLORES: Record<CategoriaKiosco, string> = {
  Bebidas:     "linear-gradient(135deg,#0ea5e9,#0369a1)",
  Cigarrillos: "linear-gradient(135deg,#737373,#404040)",
  Alfajores:   "linear-gradient(135deg,#d97706,#92400e)",
  Golosinas:   "linear-gradient(135deg,#ec4899,#9d174d)",
  Snacks:      "linear-gradient(135deg,#f59e0b,#b45309)",
  Otros:       "linear-gradient(135deg,#10b981,#065f46)",
}

export function categoriaColor(cat: string): string {
  return COLORES[cat as CategoriaKiosco] ?? COLORES.Otros
}

type Props = { activa: CategoriaActiva; onChange: (c: CategoriaActiva) => void }

export function CategoryTabs({ activa, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
      {CATEGORIAS_TABS.map((c) => {
        const sel = activa === c
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`shrink-0 h-10 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
              sel
                ? "border-accent bg-accent text-accent-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:border-accent/50"
            }`}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}

export { CATEGORIAS_TABS }
