CREATE TABLE financial_reversals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 payment_id uuid NOT NULL UNIQUE REFERENCES financial_payments(id),
 actor_id uuid NOT NULL,
 reason varchar(1000) NOT NULL CHECK(length(trim(reason))>=5),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE financial_reversals ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON financial_reversals TO amtech_api;
CREATE POLICY backend_read ON financial_reversals FOR SELECT TO amtech_api USING(true);
CREATE POLICY backend_insert ON financial_reversals FOR INSERT TO amtech_api WITH CHECK(true);
