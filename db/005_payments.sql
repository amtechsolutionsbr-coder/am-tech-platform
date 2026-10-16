CREATE TABLE financial_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 entry_id uuid NOT NULL REFERENCES financial_entries(id),
 amount_cents bigint NOT NULL CHECK(amount_cents>0 AND amount_cents<=1000000000),
 paid_date date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX financial_payments_entry ON financial_payments(entry_id);
-- Preserva as quitações registradas antes desta etapa.
INSERT INTO financial_payments(entry_id,amount_cents,paid_date)
SELECT id,amount_cents,settled_date FROM financial_entries WHERE settled_date IS NOT NULL;
ALTER TABLE financial_payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON financial_payments TO amtech_api;
CREATE POLICY backend_read ON financial_payments FOR SELECT TO amtech_api USING(true);
CREATE POLICY backend_insert ON financial_payments FOR INSERT TO amtech_api WITH CHECK(true);
