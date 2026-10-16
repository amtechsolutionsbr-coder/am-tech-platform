# Primeiro administrador — AM Tech Platform

## Pré-requisitos
O projeto Supabase empresarial é `xyzzkpdipdupgrywwhna`. Não usar nenhum projeto da Adimax.

## Criar a identidade
1. No painel Supabase empresarial, acesse Authentication > Users.
2. Crie ou convide o usuário administrativo utilizando um e-mail sob controle da empresa.
3. Configure a senha por fluxo seguro. Não coloque senhas no GitHub ou neste documento.
4. Copie o UUID do usuário gerado pelo Supabase Auth.

## Autorizar a identidade
No SQL Editor **do projeto empresarial**, execute substituindo o UUID abaixo pelo UUID real:

```sql
INSERT INTO public.admin_users (auth_user_id, role, active)
VALUES ('SUBSTITUA_PELO_UUID_REAL'::uuid, 'owner', true)
ON CONFLICT (auth_user_id)
DO UPDATE SET role = 'owner', active = true;
```

Esse procedimento só deve ser executado para o usuário legítimo responsável pela empresa. Não é possível conceder privilégios apenas com um endereço de e-mail.

## Verificação
- Com token válido do usuário autorizado, `GET /api/me` deve retornar `role: owner`.
- Sem token, deve retornar 401.
- Com usuário autenticado mas não cadastrado em `admin_users`, deve retornar 403.
- Não publicar sem verificar os três cenários.

## Cuidados
- A interface utiliza uma chave pública do Supabase. Nunca usar chave secreta ou service_role no navegador.
- A API precisa de conexão PostgreSQL com permissões restritas.
- O primeiro login real ainda não foi executado e validado.
