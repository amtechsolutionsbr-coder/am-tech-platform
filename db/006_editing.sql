GRANT UPDATE(name,email,phone,status) ON clients TO amtech_api;
CREATE POLICY backend_update ON clients FOR UPDATE TO amtech_api USING(true) WITH CHECK(true);
GRANT UPDATE(name,app_url,stage) ON client_apps TO amtech_api;
CREATE POLICY backend_update ON client_apps FOR UPDATE TO amtech_api USING(true) WITH CHECK(true);
