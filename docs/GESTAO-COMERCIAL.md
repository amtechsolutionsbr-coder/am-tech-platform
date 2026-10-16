# Gestão comercial

Em código, ainda sem implantação desta etapa.

Owner/admin podem editar produtos (nome, descrição, ativo), planos (nome, valor, periodicidade, ativo) e situações de orçamentos e assinaturas. Valores e periodicidade de planos já vinculados a assinaturas são protegidos: criar outro plano para uma nova condição comercial. Cada alteração exige autorização revalidada na transação e auditoria atômica. Não há exclusão.

Atualizar situação é uma decisão administrativa; não envia mensagens, não assina contratos e não realiza cobranças bancárias. Valores de planos existentes não são reajustados automaticamente.

Aplicar db/007_commercial.sql no projeto empresarial antes de publicar API e frontend. Validação local: 47 testes aprovados e React/Vite compilado. Falta homologação autenticada da nova tela.

Próximas entregas para fechar a plataforma antes do aplicativo da adega: suporte, correção/estorno financeiro com histórico, filtros e exportação, revisão de operação e validação final. O desenvolvimento do sistema da adega começa após fechar esta etapa da plataforma, conforme solicitado.
