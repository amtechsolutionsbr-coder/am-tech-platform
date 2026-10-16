GRANT UPDATE(name,description,active) ON products TO amtech_api;
GRANT UPDATE(name,price_cents,billing_cycle,active) ON plans TO amtech_api;
GRANT UPDATE(status) ON subscriptions,quotes TO amtech_api;
CREATE POLICY backend_update ON products FOR UPDATE TO amtech_api USING(true) WITH CHECK(true);
CREATE POLICY backend_update ON plans FOR UPDATE TO amtech_api USING(true) WITH CHECK(true);
CREATE POLICY backend_update ON subscriptions FOR UPDATE TO amtech_api USING(true) WITH CHECK(true);
CREATE POLICY backend_update ON quotes FOR UPDATE TO amtech_api USING(true) WITH CHECK(true);
