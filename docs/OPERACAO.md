# Operação e manutenção — AM Tech Platform 0.2.0

## Acesso
Use uma identidade real criada em Supabase Authentication. O login não concede acesso automaticamente: é necessário um vínculo ativo em `public.admin_users`. O perfil é consultado no banco em cada requisição, sem confiar nos metadados editáveis do usuário.

| Perfil | Consultar os cinco módulos | Cadastrar | Alterar acessos existentes |
|---|---|---|---|
| owner | Sim | Sim | Sim |
| admin | Sim | Sim | Não |
| viewer | Sim | Não | Não |
| support (compatibilidade) | Sim | Não | Não |

O proprietário pode atualizar o perfil e ativar/desativar vínculos existentes na aba Acessos. Não é possível remover o último proprietário ativo. Inclusão de novas identidades requer o procedimento administrativo abaixo; a aplicação não cria contas fictícias nem envia convites automaticamente.

## Cadastro comercial
1. Cadastre o cliente em Clientes.
2. Cadastre o produto e depois seu plano. Preços usam reais na tela e centavos inteiros no banco.
3. Vincule cliente ativo a plano e produto ativos em Nova assinatura.
4. A assinatura inicia pendente. Não há pagamento ou cobrança automática.
5. Em Orçamentos, informe horas, valor por hora, despesas e acréscimo sobre custos. O servidor recalcula o total; o acréscimo não é margem líquida.

Os cadastros comerciais listam até 100 registros. A aba Gestão comercial permite editar produtos/planos e situações de orçamentos/assinaturas; planos contratados preservam preço e periodicidade. Clientes e aplicativos também têm edição. Não há exclusão nem paginação integral. Nenhum processo automático apaga dados.

## Autorizar outra identidade real
Um operador com acesso ao SQL Editor do projeto empresarial verifica o UUID em Authentication > Users e insere o vínculo correspondente. Primeiro confirme a existência da identidade:

```sql
SELECT id, email FROM auth.users WHERE id = 'UUID_REAL'::uuid;
-- Execute somente após verificar a identidade e o perfil pretendido.
INSERT INTO public.admin_users(auth_user_id,role,active)
SELECT id, 'viewer', true FROM auth.users WHERE id = 'UUID_REAL'::uuid
ON CONFLICT (auth_user_id) DO NOTHING;
```

O proprietário pode depois alterar esse vínculo pela plataforma. Nunca conceda privilégios com base apenas em um endereço de e-mail informado pelo cliente.

## Saúde e incidentes
- `/health`: processo HTTP ativo; não prova acesso ao banco ou login.
- `/ready`: API consegue consultar o cadastro de acessos com sua conexão privada.
- 401: token ausente, inválido ou expirado. Refaça o login.
- 403: vínculo ausente, inativo ou perfil insuficiente.
- 409 ao alterar acesso: é necessário preservar um proprietário ativo.
- 422: corrija os dados enviados.
- 503 em `/ready`: revise a conexão, TLS e permissões SQL no Render.
- 500: consulte os logs; a resposta pública não expõe detalhes nem credenciais.

Cadastros e alteração de acessos gravam eventos de auditoria na mesma transação. Se a auditoria falhar, o cadastro é revertido. O papel técnico do backend não tem permissão de apagar registros nem reescrever eventos de auditoria. Não compartilhe `DATABASE_URL` nem conceda o papel técnico às identidades públicas `anon`, `authenticated` ou `authenticator`.

## Manutenção
Antes de atualizar: confirme backups disponíveis no plano Supabase e exporte um backup privado verificável. O backup não foi automatizado por este projeto. Execute `npm ci --ignore-scripts`, `npm --prefix web ci`, `npm test` e `npm --prefix web run build`; revise os resultados do GitHub Actions e do Render. Para voltar código, use um novo commit de reversão e redeploy; não reverta ou apague tabelas de produção automaticamente.

Rotacione o segredo do papel SQL `amtech_api` pelo painel seguro do banco e atualize `DATABASE_URL` no Render na mesma janela. Nunca cole segredos em issues, commits, documentação ou conversas. Atualize dependências intencionalmente, revise os lockfiles e rode auditoria e testes novamente.

O desktop é um invólucro do site hospedado, depende de internet e ainda exige homologação Windows. A versão móvel é web responsiva; não há sincronização offline nem aplicativo nativo homologado.

## Financeiro, aplicativos e suporte
Somente owner/admin acessam o financeiro, a central de aplicativos e a manutenção comercial. Viewer/support permanecem em leitura dos cadastros e dos chamados.

Financeiro: registre o valor total da receita/despesa, primeiro vencimento e de 1 a 36 parcelas mensais. O sistema preserva centavos. Registre pagamentos parciais ou quite o saldo; nenhuma ação realiza cobrança ou devolução bancária. Para erro no pagamento, abra o histórico e escolha Corrigir por estorno, informando o motivo. O original fica preservado e o saldo reabre. Para lançamento com valor ou vencimento incorreto, ainda é necessário procedimento de correção administrativa: não apague registros diretamente.

Filtros e CSV abrangem até 200 lançamentos carregados; indicadores gerais abrangem toda a base. Resumo mensal mostra até 24 meses com pagamentos válidos. Saldo de caixa não é lucro contábil.

Suporte: vincule o chamado a cliente e opcionalmente a aplicativo desse cliente. Defina prioridade e registre notas para alterar a situação. O histórico não é reescrito. Não há envio automático de mensagens.

A central cadastra e abre aplicativos. Monitoramento e visão operacional interna dos clientes ainda não estão integrados. Os aplicativos mantêm suas próprias permissões.
