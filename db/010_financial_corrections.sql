CREATE TABLE financial_corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 entry_id uuid NOT NULL REFERENCES financial_entries(id),
 actor_id uuid NOT NULL,
 reason varchar(1000) NOT NULL CHECK(length(trim(reason))>=5),
 previous_data jsonb NOT NULL,
 new_data jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX financial_corrections_entry ON financial_corrections(entry_id);
ALTER TABLE financial_corrections ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON financial_corrections TO amtech_api;
GRANT UPDATE(description,amount_cents,due_date) ON financial_entries TO amtech_api;
CREATE POLICY backend_read ON financial_corrections FOR SELECT TO amtech_api USING(true);
CREATE POLICY backend_insert ON financial_corrections FOR INSERT TO amtech_api WITH CHECK(true);
