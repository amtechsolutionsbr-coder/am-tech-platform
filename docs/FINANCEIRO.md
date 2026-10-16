# Financeiro — primeira etapa

Implementação preparada para homologação, ainda não implantada.

## Disponível no código
- Receitas e despesas manuais em BRL, com valores inteiros em centavos.
- Vencimento, vínculo opcional com cliente e registro da quitação parcial ou integral.
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
46 testes aprovados com Node test runner e PostgreSQL isolado PGlite, incluindo o papel SQL restrito. Compilação React/Vite aprovada. A validação em produção e a inspeção visual autenticada ainda estão pendentes.

## Próximas etapas
Cancelamento/estorno auditado, filtros mensais e exportação, despesas por projeto, fluxo comercial completo e suporte ainda precisam de implementação. Cobrança bancária e recorrência automática não estão integradas. Saldo de caixa não é lucro contábil.

## Executável Windows
A estrutura Electron/NSIS já existe. O instalador será gerado após homologação funcional do app. Ele abre a aplicação HTTPS e exige internet; não possui banco local nem sincronização offline. Não incluir segredos no pacote. Executar build e teste de instalação em Windows, validar login, permissões, atualização e preservação dos dados antes de declarar entrega.

## Evolução desta etapa
Aplicar db/005_payments.sql após 003 e 004: cria histórico de pagamentos e preserva quitações anteriores. Pagamentos parciais são registrados por valor e data, com bloqueio do lançamento durante a transação para impedir saldo excedente. Resumo mensal de caixa mostra até 24 meses com movimentação. Ainda sem estorno ou edição de pagamentos. A quitação integral cobre o saldo restante.

Aplicar db/006_editing.sql para edição auditada de clientes (nome, contato, situação) e aplicativos (nome, URL, etapa). As identidades são preservadas.

Parcelamento mensal de 1 a 36 parcelas implementado: o valor informado é o total, a divisão preserva os centavos e vencimentos são limitados ao último dia do mês mantendo o dia original nos meses seguintes. Cada parcela possui seu lançamento e auditoria; todas são criadas na mesma transação. Histórico de pagamentos por lançamento disponível na interface.

## Correções e consulta
Estorno integral de um pagamento implementado com motivo obrigatório e registro separado imutável. Reabre saldo, exclui o pagamento estornado dos totais e mantém o original no histórico. Não representa devolução bancária. O resumo mensal recalcula os pagamentos válidos; não é demonstrativo contábil de estornos por competência.

Filtros locais por mês do vencimento, tipo e situação, com CSV dos até 200 registros carregados. Totais gerais continuam abrangendo toda a base. Ainda não há exportação integral paginada. Aplicar db/009_reversals.sql antes de publicar. Validação local atual: 49 testes e compilação React/Vite aprovados; ainda sem publicação desta etapa.

## Correção de lançamento sem pagamento ativo
Implementada edição de descrição, valor e vencimento, exigindo motivo de 5 a 1000 caracteres. O registro anterior e o novo ficam em financial_corrections, sem alteração ou exclusão pelo backend. Pagamentos ativos bloqueiam edição; é necessário estornar primeiro. A correção afeta apenas o lançamento escolhido, não as demais parcelas. Não muda cliente nem tipo da receita/despesa. Nova tela e API ainda sem publicação; aplicar db/010_financial_corrections.sql antes de disponibilizar. 50 testes locais aprovados e React/Vite compilado.

## Consulta e exportação integral — evolução oficial
Filtros de mês do vencimento, tipo e situação agora são aplicados no PostgreSQL sobre toda a base. Lista paginada de 50 registros, com navegação e total filtrado. A API aceita page_size até 200. Indicadores gerais continuam considerando todos os lançamentos.

Exportação CSV autenticada inclui todos os resultados filtrados, independente da página, usando cursor de leitura em transação consistente e lotes de 500 registros. Conteúdo que poderia virar fórmula ao abrir em planilha é neutralizado. O CSV não é um backup recuperável do banco.

54 testes locais aprovados, incluindo 205 lançamentos em banco descartável, três páginas e exportação completa. React/Vite compilado. Não houve inserção de dados de teste em produção. Esta alteração ainda requer publicação e homologação autenticada. Os demais cadastros ainda mantêm seus limites anteriores.
