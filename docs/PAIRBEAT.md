# PairBeat no KONAET Atlas

A área [Música](https://7dsolv.github.io/konaet-atlas/#music) tem três fontes
distintas: arquivos locais escolhidos pelo visitante, um pequeno estudo original
de demonstração e a biblioteca pública importada do `@PairBeat7dsbot`.

Arquivos locais não são enviados. A demonstração é um arpejo sintetizado de
4,4 segundos, sem gravações de terceiros. Faixas do bot são arquivos de áudio
publicados pelo proprietário vinculado; não representam acesso ao histórico
inteiro da sua conta do Telegram.

## Fluxo da biblioteca

1. O proprietário abre o link de vínculo recebido na configuração e toca em
   **Iniciar**, ou envia `/vincular CODIGO` na conversa privada com o bot.
2. O coletor verifica o código, a conversa privada e a identidade do remetente.
   Só o primeiro vínculo válido se torna proprietário.
3. Áudios novos enviados por essa conta são baixados no runner do GitHub.
   Mensagens de outras contas não publicam conteúdo.
4. O arquivo é identificado por SHA-256 e publicado em uma release própria.
   Repetir uma faixa não duplica o arquivo ou a entrada no catálogo.
5. O coletor atualiza `site/music/catalog.json` e dispara a publicação do Pages.
   O player carrega o catálogo e abre a URL pública do áudio.

**Os áudios publicados ficam públicos.** Conversas, IDs de chat, tokens e URLs
privadas de arquivos do Telegram não entram no catálogo. O cursor do coletor
guarda apenas um identificador de atualização e um HMAC da conta vinculada;
a chave desse HMAC permanece nos Secrets.

## Configuração

O workflow [pairbeat.yml](../.github/workflows/pairbeat.yml) usa três
[Secrets do repositório](https://github.com/7dsolv/konaet-atlas/settings/secrets/actions):

| Secret | Função |
| --- | --- |
| `PAIRBEAT_BOT_TOKEN` | Autenticação do bot no Telegram |
| `PAIRBEAT_LINK_CODE` | Código aleatório do primeiro vínculo |
| `PAIRBEAT_OWNER_KEY` | Chave aleatória estável para reconhecer o proprietário |

Nenhum desses valores deve ser colocado no código, no catálogo ou na página.
Para rotacionar a credencial do Telegram, substitua somente
`PAIRBEAT_BOT_TOKEN`; preserve `PAIRBEAT_OWNER_KEY` para manter o vínculo.
Uma nova instalação deve gerar seu próprio código e chave.

O coletor usa o `GITHUB_TOKEN` temporário do workflow para publicar os áudios,
salvar o cursor e solicitar a atualização do Pages. Ele não depende de um PAT
persistente nem de uma máquina pessoal ligada. Os Secrets não são
disponibilizados ao workflow que compila a interface.

## Frequência e limites

A sincronização está agendada a cada cinco minutos. O GitHub pode atrasar
execuções agendadas; o fluxo não promete publicação instantânea. Também é
possível executar **Sync PairBeat music → Run workflow** manualmente.

O coletor aceita mensagens do tipo **audio**, com contêiner MP3, M4A, OGG ou
WAV reconhecido pelo conteúdo. A implementação limita cada importação a 20 MiB,
de acordo com o limite de download da API de nuvem do Telegram. Arquivos enviados
como documento ou mensagem de voz não são importados por este coletor.

Esta biblioteca pessoal comporta até 250 faixas; GitHub Releases fornece a
distribuição dos arquivos. Não é um serviço de streaming com SLA, nem uma nuvem
ilimitada. Bibliotecas comerciais ou grandes volumes devem usar armazenamento
e CDN próprios.

O bot precisa ter **um único consumidor de atualizações**. Se houver webhook
ativo, o coletor para sem removê-lo. Se já existir outro processo usando
long polling, integre a publicação a esse processo antes de ativar este
workflow. O coletor não tenta tomar o controle de uma integração existente.

## Verificação e recuperação

```sh
python -m unittest discover -s tests -p "test_*.py"
node --test tests/atlas.test.mjs tests/music.test.mjs
```

Os testes cobrem vínculo, remetentes não autorizados, duplicações, limites de
arquivo, caminhos inválidos, preservação de webhook, falha de download e
recuperação após falhas de gravação ou publicação. Não enviam mensagens reais.
Os testes de DOM usam um player simulado; a decodificação e saída sonora reais
dependem do navegador e do dispositivo.

O cursor só avança depois que o processamento durável termina. Uma falha
temporária deixa a atualização para nova tentativa. A solicitação de
publicação pendente também é repetida no ciclo seguinte.

Referências: [Telegram Bot API](https://core.telegram.org/bots/api#getfile),
[atualizações do Telegram](https://core.telegram.org/bots/faq#how-do-i-get-updates),
[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
e [disparo de workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
