CREATE TABLE support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES clients(id),
 app_id uuid REFERENCES client_apps(id),
 title varchar(160) NOT NULL CHECK(length(trim(title))>=3),
 description text NOT NULL CHECK(length(trim(description)) BETWEEN 3 AND 4000),
 priority text NOT NULL CHECK(priority IN ('low','normal','high','urgent')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','waiting','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE support_updates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id uuid NOT NULL REFERENCES support_tickets(id),
 actor_id uuid NOT NULL,
 status text NOT NULL CHECK(status IN ('open','in_progress','waiting','resolved')),
 note text NOT NULL CHECK(length(trim(note)) BETWEEN 3 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_tickets_client ON support_tickets(client_id);
CREATE INDEX support_tickets_app ON support_tickets(app_id);
CREATE INDEX support_updates_ticket ON support_updates(ticket_id);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_updates ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON support_tickets,support_updates TO amtech_api;
GRANT UPDATE(status,updated_at) ON support_tickets TO amtech_api;
CREATE POLICY backend_read ON support_tickets FOR SELECT TO amtech_api USING(true);
CREATE POLICY backend_insert ON support_tickets FOR INSERT TO amtech_api WITH CHECK(true);
CREATE POLICY backend_update ON support_tickets FOR UPDATE TO amtech_api USING(true) WITH CHECK(true);
CREATE POLICY backend_read ON support_updates FOR SELECT TO amtech_api USING(true);
CREATE POLICY backend_insert ON support_updates FOR INSERT TO amtech_api WITH CHECK(true);
