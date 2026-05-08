"use client"

import { ShoppingCart, MessageCircle } from "lucide-react"

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,oklch(0.83_0.17_163/0.07),transparent)]" />

      <div className="w-full max-w-sm relative text-center">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-5 shadow-[0_0_40px_oklch(0.83_0.17_163/0.4)]">
            <ShoppingCart className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Acceso por invitación</h1>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
            Las cuentas se crean de forma personalizada.<br />
            Contactanos para empezar.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
          <a
            href="https://wa.me/5491100000000"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25d366] text-white font-bold py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Contactar por WhatsApp
          </a>

          <a
            href="/login"
            className="block w-full border border-border text-foreground font-semibold py-3.5 rounded-xl hover:bg-secondary transition-colors text-sm"
          >
            Ya tengo cuenta → Ingresar
          </a>
        </div>
      </div>
    </main>
  )
}
