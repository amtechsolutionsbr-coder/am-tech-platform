# Suporte interno

Chamados vinculados a cliente e, opcionalmente, ao aplicativo desse mesmo cliente. Prioridades baixa, normal, alta e urgente; situações aberto, em atendimento, aguardando e resolvido. Cada atualização exige nota e preserva o histórico anterior. Owner/admin escrevem; viewer/support consultam. Não há portal externo ou envio automático de mensagens.

Aplicar db/008_support.sql após 007. Em Supabase, revogar privilégios públicos das novas tabelas; RLS possui políticas exclusivas do papel amtech_api. Histórico é somente leitura/inserção para o backend. Frontend e API devem ser publicados juntos.

48 testes locais aprovados, incluindo vínculo com aplicativo, consulta de histórico, bloqueio de alteração por leitura e proibição de apagar chamados ou reescrever notas. React/Vite compilado. Esta etapa ainda não foi implantada ou homologada com login real.
