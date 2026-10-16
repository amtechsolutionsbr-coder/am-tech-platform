# AM Tech Platform para Windows

O aplicativo desktop abre a plataforma hospedada e exige internet. Não exige instalar Python, Node.js ou ferramentas de desenvolvimento no computador de uso. Os dados permanecem no Supabase; desinstalar o programa não apaga os cadastros do servidor.

## Geração
No GitHub Actions, executar manualmente Gerar instalador Windows. O workflow usa Windows, executa testes, gera instalador NSIS x64 e SHA256 e disponibiliza o artefato AM-Tech-Platform-Windows. Não publica uma release automaticamente. O instalador ainda não foi assinado digitalmente; não declarar assinatura ou homologação antes da verificação.

Alternativa em máquina de desenvolvimento Windows com Node 22:

```powershell
npm ci
$env:AM_TECH_APP_URL = 'https://am-tech-platform.onrender.com/'
npm run desktop:pack -- --publish never
```

## Instalação e verificação
1. Extrair o artefato e conferir o SHA256 usando Get-FileHash.
2. Executar o instalador, escolher a pasta e concluir.
3. Abrir o atalho AM Tech Platform e entrar com a conta real já autorizada.
4. Conferir visão geral, cadastros, financeiro, suporte e links externos.
5. Fechar e abrir novamente; conferir login e preservação dos registros.
6. Testar reinstalação/atualização e desinstalação em Windows antes de distribuição comercial.

Não contornar alertas de segurança automaticamente. Sem certificado de assinatura, avaliar a distribuição antes de entregar a terceiros. A instalação e abertura reais no Windows ainda estão pendentes.
