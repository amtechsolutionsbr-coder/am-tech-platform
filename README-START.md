# AM Tech Platform — v0.1.0 (base inicial)

API inicial Node.js 20+, PostgreSQL e autenticação Supabase JWT. **Não é uma versão pronta para produção.**

## Executar localmente
1. Instale Node.js 20+ e PostgreSQL.
2. Rode `npm install`.
3. Copie `.env.example` para `.env` e configure as variáveis no ambiente (Node não carrega .env automaticamente; use `node --env-file=.env src/server.js` em Node compatível).
4. Aplique `db/001_initial.sql` no banco empresarial de desenvolvimento.
5. Cadastre manualmente o UUID do primeiro administrador na tabela `admin_users` somente depois de criar a conta no Supabase Auth.
6. Rode `npm start` com as variáveis de ambiente carregadas.
7. Teste `GET /health`. Rotas de clientes exigem Bearer JWT válido e usuário em `admin_users`.

## Endpoints implementados
- `GET /health` — verificação básica.
- `GET /api/clients` — lista clientes para membros internos autorizados.
- `POST /api/clients` — cadastra cliente para owner/admin, com auditoria.

## Limitações atuais
- Ainda não há interface React nem login visual.
- Catálogo, planos, assinaturas e auditoria estão modelados, mas não possuem API.
- Não configurar implantação pública antes de validar TLS do banco, credenciais de menor privilégio, rate limiting, logs, backups e testes automatizados.
- O backend exige tokens JWT assimétricos compatíveis com JWKS; validar configuração do projeto Supabase antes do uso.
