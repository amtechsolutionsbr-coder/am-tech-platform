-- Private read-only SQL identity for business backups; not a Supabase Auth user.
CREATE ROLE amtech_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
GRANT CONNECT ON DATABASE postgres TO amtech_backup;
GRANT USAGE ON SCHEMA public TO amtech_backup;
GRANT SELECT ON public.admin_users, public.clients, public.products, public.plans, public.subscriptions, public.quotes, public.audit_events, public.financial_entries, public.financial_payments, public.client_apps, public.support_tickets, public.support_updates, public.financial_reversals, public.financial_corrections TO amtech_backup;
ALTER ROLE amtech_backup SET search_path = public, pg_catalog;
ALTER ROLE amtech_backup SET default_transaction_read_only = on;
ALTER ROLE amtech_backup SET statement_timeout = '60s';
ALTER ROLE amtech_backup SET idle_in_transaction_session_timeout = '60s';
CREATE POLICY business_backup_read ON public.admin_users FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.clients FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.products FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.plans FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.subscriptions FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.quotes FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.audit_events FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.financial_entries FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.financial_payments FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.client_apps FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.support_tickets FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.support_updates FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.financial_reversals FOR SELECT TO amtech_backup USING (true);
CREATE POLICY business_backup_read ON public.financial_corrections FOR SELECT TO amtech_backup USING (true);
-- No password is created or committed. Enable LOGIN and set password privately.
-- Never grant this role to anon, authenticated, authenticator or the API role.
