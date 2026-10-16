# Fechamento da primeira versão web

## Implementado
Clientes, produtos, planos, assinaturas, orçamentos, controle de acessos, central de aplicativos, receitas/despesas, parcelas, pagamentos parciais, quitações, estornos, correções com motivo e histórico, resumo mensal, filtros, paginação e exportação CSV completa dos resultados filtrados, suporte e créditos AM Tech.

## Evidências
61 testes locais aprovados após a correção de conexão do desktop; React/Vite compilado. Testes exercitam PostgreSQL isolado e o papel restrito. Não equivalem à homologação visual autenticada. Usuário confirmou funcionamento do acesso e da versão anterior; não confirmou individualmente todos os novos fluxos.

## Verificação autenticada pendente
Com dados legítimos, conferir cliente → produto/plano → orçamento → assinatura → lançamento financeiro → pagamento e histórico. Estorno e correção devem ser usados somente quando houver um erro real. Conferir chamado e sua resolução, edição de aplicativos, comportamento em celular e segunda identidade real com leitura. Não criar dados fictícios em produção nem compartilhar senhas.

## Limites conhecidos
- Cobranças e devoluções bancárias são externas; o financeiro registra movimentações manualmente.
- APIs de cadastros paginadas; a interface reúne todas as páginas. Financeiro usa páginas visuais e o CSV percorre todos os resultados filtrados. Bases muito grandes ainda exigem avaliar o consumo de memória das listas de cadastros.
- Saldo de caixa não é lucro contábil; não há conciliação bancária ou emissão fiscal.
- Central abre aplicativos, sem visão de dados internos/monitoramento integrado.
- Backups ainda não automatizados pelo projeto; verificar recuperação antes de uso comercial.
- Proteção Supabase contra senhas vazadas está desativada e deve ser revisada conforme disponibilidade do plano.
- Instalador Windows gerado, instalado e aberto automaticamente em Windows isolado. Instalação e fluxos autenticados no PC pessoal continuam pendentes; o desktop depende de internet.

O aplicativo da adega começa após o fechamento desta plataforma. Este documento não declara conclusão de verificações pendentes.

## Retorno do usuário
Em 16/10/2026, o usuário confirmou que as telas consultadas funcionam no seu acesso. Confirmação de uso não equivale a execução independente de todos os casos, como segunda identidade de leitura, recuperação de backup e instalação Windows. A instalação e abertura automáticas foram verificadas no workflow Windows; isso não substitui a validação no computador de uso.

## Integrações externas
Por decisão do usuário, conectar somente aplicativos oficiais e homologados. Nenhuma conexão com demonstrações ou projetos em desenvolvimento foi ativada. A proposta de API de chamados externos permanece separada da versão principal, sem migração aplicada em produção.
