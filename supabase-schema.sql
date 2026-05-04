-- =====================================================
-- POS SaaS — Schema de Supabase
-- Pegar en: Supabase Dashboard > SQL Editor > New query
-- =====================================================

-- 1. Tabla de comercios (un registro por negocio)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Relacion usuarios <-> comercios
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'cajero', -- 'owner' | 'cajero'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- 3. Stock
CREATE TABLE stock (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  producto TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 0,
  precio_costo NUMERIC(12,2) NOT NULL,
  precio_venta NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ventas
CREATE TABLE ventas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  producto TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  total_venta NUMERIC(12,2) NOT NULL,
  costo NUMERIC(12,2) NOT NULL,
  ganancia NUMERIC(12,2) NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  monto_efectivo NUMERIC(12,2) DEFAULT 0,
  monto_transferencia NUMERIC(12,2) DEFAULT 0,
  fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Cierres de caja
CREATE TABLE cierres_caja (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  fecha DATE NOT NULL,
  total_ventas NUMERIC(12,2) NOT NULL,
  total_costos NUMERIC(12,2) NOT NULL,
  total_ganancias NUMERIC(12,2) NOT NULL,
  cantidad_ventas INTEGER NOT NULL,
  efectivo NUMERIC(12,2) NOT NULL DEFAULT 0,
  transferencia NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, fecha)
);

-- =====================================================
-- Funcion helper para obtener el tenant del usuario logueado
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =====================================================
-- Row Level Security (RLS) — cada comercio ve solo sus datos
-- =====================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;

-- Tenants: solo puede ver/editar su propio comercio
CREATE POLICY "tenant propio" ON tenants
  FOR ALL USING (id = get_my_tenant_id());

-- Tenant_users: solo ve sus propias filas
CREATE POLICY "ver mis tenant_users" ON tenant_users
  FOR ALL USING (user_id = auth.uid());

-- Stock: solo del propio tenant
CREATE POLICY "stock del tenant" ON stock
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- Ventas: solo del propio tenant
CREATE POLICY "ventas del tenant" ON ventas
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- Cierres: solo del propio tenant
CREATE POLICY "cierres del tenant" ON cierres_caja
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- =====================================================
-- Indices para performance
-- =====================================================
CREATE INDEX idx_stock_tenant ON stock(tenant_id);
CREATE INDEX idx_ventas_tenant_fecha ON ventas(tenant_id, fecha);
CREATE INDEX idx_cierres_tenant_fecha ON cierres_caja(tenant_id, fecha);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
