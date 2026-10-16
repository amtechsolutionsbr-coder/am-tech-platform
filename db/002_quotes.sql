-- Orçamentos sob medida AM Tech Solutions
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  title varchar(160) NOT NULL,
  complexity text NOT NULL CHECK(complexity IN ('simple','medium','advanced','custom')),
  estimated_hours integer NOT NULL CHECK(estimated_hours BETWEEN 1 AND 100000),
  hourly_rate_cents bigint NOT NULL CHECK(hourly_rate_cents BETWEEN 0 AND 10000000),
  extra_cost_cents bigint NOT NULL DEFAULT 0 CHECK(extra_cost_cents BETWEEN 0 AND 1000000000),
  margin_percent integer NOT NULL DEFAULT 0 CHECK(margin_percent BETWEEN 0 AND 500),
  total_cents bigint NOT NULL CHECK(total_cents BETWEEN 0 AND 100000000000),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','approved','rejected','expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON public.quotes(client_id);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
