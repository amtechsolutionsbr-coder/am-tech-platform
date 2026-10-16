-- Aplicar após a identidade técnica amtech_api. Não altera registros existentes.
CREATE TABLE financial_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('income','expense')),
 description varchar(160) NOT NULL CHECK(length(trim(description)) >= 3),
 client_id uuid REFERENCES clients(id),
 amount_cents bigint NOT NULL CHECK(amount_cents > 0 AND amount_cents <= 1000000000),
 due_date date NOT NULL,
 settled_date date,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX financial_entries_due ON financial_entries(due_date);
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON financial_entries TO amtech_api;
GRANT UPDATE(settled_date) ON financial_entries TO amtech_api;
CREATE POLICY backend_read ON financial_entries FOR SELECT TO amtech_api USING(true);
CREATE POLICY backend_insert ON financial_entries FOR INSERT TO amtech_api WITH CHECK(true);
CREATE POLICY backend_settle ON financial_entries FOR UPDATE TO amtech_api USING(true) WITH CHECK(true);
