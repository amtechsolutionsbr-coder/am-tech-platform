# Verificação da publicação — 16/10/2026

Aplicação: https://am-tech-platform.onrender.com/

Commit de aplicação: 9aa0ec97f85e32a4f1e567bdf31ae3cf4e2c6677.
GitHub Actions: https://github.com/amtechsolutionsbr-coder/am-tech-platform/actions/runs/38890431850 — success.
Render deploy dep-db905ijrjlhs73doirb0 — live.

46 testes locais aprovados e React/Vite compilado. Migrações 003–006 aplicadas em transação no Supabase empresarial xyzzkpdipdupgrywwhna; anon/authenticated sem privilégios nas três novas tabelas. Papel amtech_api com leitura e sem DELETE de lançamentos ou UPDATE de pagamentos. Não foram criados registros comerciais de teste.

Verificação pública: /health 200, /ready 200, /api/finance sem token 401. Navegador abriu a tela de login com os créditos AM Tech. Nenhum log de nível error retornado no intervalo pós-deploy consultado.

Disponível para homologação: receitas/despesas, pagamentos parciais, quitação do saldo, parcelas mensais com preservação dos centavos, histórico, resumo mensal, edição de clientes/aplicativos, catálogo dos aplicativos, identidade tecnológica e créditos.

A sessão do navegador de validação não estava autenticada. Fluxos internos reais e inspeção visual interna continuam pendentes; não foi solicitada nem utilizada senha. Ainda não há integração operacional com aplicativos externos, cobrança bancária automática, estorno, módulo de suporte completo ou executável Windows homologado.

O advisor Supabase apontou proteção contra senhas vazadas desativada. Consultar https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection para disponibilidade e ativação. Nenhuma proteção foi desativada nesta etapa.
