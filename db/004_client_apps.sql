-- Catálogo de aplicativos; não concede acesso ao banco dos clientes.
CREATE TABLE client_apps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES clients(id),
 name varchar(120) NOT NULL CHECK(length(trim(name))>=2),
 app_url varchar(2048) NOT NULL CHECK(app_url ~ '^https://'),
 stage text NOT NULL DEFAULT 'development' CHECK(stage IN ('development','acceptance','production','paused')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX client_apps_client ON client_apps(client_id);
ALTER TABLE client_apps ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON client_apps TO amtech_api;
CREATE POLICY backend_read ON client_apps FOR SELECT TO amtech_api USING(true);
CREATE POLICY backend_insert ON client_apps FOR INSERT TO amtech_api WITH CHECK(true);
