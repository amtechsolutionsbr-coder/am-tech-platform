CREATE TABLE client_app_users (
 auth_user_id uuid NOT NULL,
 app_id uuid NOT NULL REFERENCES client_apps(id),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(auth_user_id,app_id)
);
ALTER TABLE client_app_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON client_app_users TO amtech_api;
CREATE POLICY backend_read ON client_app_users FOR SELECT TO amtech_api USING(true);
ALTER TABLE support_updates ADD COLUMN visibility text NOT NULL DEFAULT 'internal' CHECK(visibility IN ('internal','customer'));
ALTER TABLE support_tickets ADD COLUMN external_request_id uuid;
CREATE UNIQUE INDEX support_external_request ON support_tickets(app_id,external_request_id);
