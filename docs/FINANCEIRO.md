# Financeiro — primeira etapa

Implementação preparada para homologação, ainda não implantada.

## Disponível no código
- Receitas e despesas manuais em BRL, com valores inteiros em centavos.
- Vencimento, vínculo opcional com cliente e registro da quitação integral.
- Recebido, pago, saldo de caixa, contas a receber e a pagar, considerando toda a base.
- Listagem dos últimos 200 vencimentos; situação de atraso no fuso de São Paulo.
- Acesso exclusivo owner/admin, com revalidação na transação de escrita.
- Auditoria atômica e bloqueio de quitação duplicada; sem exclusão de registros.

## Implantação
1. Aplicar db/003_finance.sql no Supabase empresarial após a configuração de amtech_api.
2. Publicar API e frontend juntos.
3. Homologar com identidade real: cadastrar receita e despesa legítimas, consultar totais e registrar quitação apenas quando efetivamente paga.
4. Não cadastrar valores fictícios em produção.

## Validação local
40 testes aprovados com Node test runner e PostgreSQL isolado PGlite, incluindo o papel SQL restrito. Compilação React/Vite aprovada. A validação em produção e a inspeção visual autenticada ainda estão pendentes.

## Próximas etapas
Pagamentos parciais, parcelas, cancelamento/estorno auditado, filtros mensais, exportação, despesas por projeto, fluxo comercial completo e suporte ainda precisam de implementação. Cobrança bancária e recorrência automática não estão integradas. Saldo de caixa não é lucro contábil.

## Executável Windows
A estrutura Electron/NSIS já existe. O instalador será gerado após homologação funcional do app. Ele abre a aplicação HTTPS e exige internet; não possui banco local nem sincronização offline. Não incluir segredos no pacote. Executar build e teste de instalação em Windows, validar login, permissões, atualização e preservação dos dados antes de declarar entrega.
