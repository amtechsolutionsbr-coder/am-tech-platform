-- Executar no PostgreSQL do projeto empresarial AM Tech (não no ambiente Adimax).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS admin_users (
  auth_user_id uuid PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('owner','admin','support','viewer')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL CHECK (length(trim(name)) >= 2),
  email varchar(254),
  phone varchar(40),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  name varchar(120) NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents >= 0),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly','one_time')),
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  plan_id uuid NOT NULL REFERENCES plans(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','cancelled','expired')),
  started_at date,
  next_billing_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);
-- Proteção adicional se o banco for acessado por API pública do Supabase.
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy pública: somente a API de backend com credencial PostgreSQL restrita
-- e autenticação/autorização obrigatória pode acessar os dados.

