-- Apply after db/001_initial.sql and db/002_quotes.sql.
-- Backend database identity only: this is NOT a Supabase Auth administrator.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='amtech_api') THEN
    CREATE ROLE amtech_api NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
GRANT CONNECT ON DATABASE postgres TO amtech_api;
GRANT USAGE ON SCHEMA public TO amtech_api;
GRANT SELECT, INSERT ON public.clients, public.products, public.plans, public.subscriptions, public.quotes TO amtech_api;
GRANT SELECT, UPDATE ON public.admin_users TO amtech_api;
GRANT INSERT ON public.audit_events TO amtech_api;
GRANT USAGE ON SEQUENCE public.audit_events_id_seq TO amtech_api;
ALTER ROLE amtech_api SET search_path = public, pg_catalog;
ALTER ROLE amtech_api SET statement_timeout = '15s';
ALTER ROLE amtech_api SET idle_in_transaction_session_timeout = '15s';
-- Only this private SQL role can use these policies. Never grant it to anon,
-- authenticated or authenticator. The Node API checks the real JWT and role.
CREATE POLICY backend_read ON public.admin_users FOR SELECT TO amtech_api USING (true);
CREATE POLICY backend_update ON public.admin_users FOR UPDATE TO amtech_api USING (true) WITH CHECK (true);
CREATE POLICY backend_insert ON public.audit_events FOR INSERT TO amtech_api WITH CHECK (true);
CREATE POLICY backend_read ON public.clients FOR SELECT TO amtech_api USING (true);
CREATE POLICY backend_insert ON public.clients FOR INSERT TO amtech_api WITH CHECK (true);
CREATE POLICY backend_read ON public.products FOR SELECT TO amtech_api USING (true);
CREATE POLICY backend_insert ON public.products FOR INSERT TO amtech_api WITH CHECK (true);
CREATE POLICY backend_read ON public.plans FOR SELECT TO amtech_api USING (true);
CREATE POLICY backend_insert ON public.plans FOR INSERT TO amtech_api WITH CHECK (true);
CREATE POLICY backend_read ON public.subscriptions FOR SELECT TO amtech_api USING (true);
CREATE POLICY backend_insert ON public.subscriptions FOR INSERT TO amtech_api WITH CHECK (true);
CREATE POLICY backend_read ON public.quotes FOR SELECT TO amtech_api USING (true);
CREATE POLICY backend_insert ON public.quotes FOR INSERT TO amtech_api WITH CHECK (true);
