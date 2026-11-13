# PairBeat no KONAET Atlas

A área [Música](https://7dsolv.github.io/konaet-atlas/#music) tem três fontes
distintas: arquivos locais escolhidos pelo visitante, um pequeno estudo original
de demonstração e a biblioteca pública importada do `@PairBeat7dsbot`.

Arquivos locais não são enviados. A demonstração é um arpejo sintetizado de
4,4 segundos, sem gravações de terceiros. Faixas do bot são arquivos de áudio
publicados pelo proprietário vinculado; não representam acesso ao histórico
inteiro da sua conta do Telegram.

Para trazer músicas antigas de outras conversas ou de Mensagens Salvas,
encaminhe os arquivos para o PairBeat pela conta vinculada. A Bot API não dá
acesso retroativo a todo o histórico pessoal da conta.

O player permanece no mesmo documento ao navegar entre Projetos, Mapa,
Música, Caderno e Perfil. A atualização automática do catálogo preserva a
faixa e a posição de reprodução. Trocar para outra aba não envia um comando
de pausa; fechar ou sair da aba do Atlas encerra seu contexto de áudio.
O sistema operacional ainda pode suspender a reprodução em segundo plano.

Quando disponível, a API Media Session oferece título/artista e controles
de reprodução do navegador, teclado de mídia e tela bloqueada. A última
faixa pública e sua posição ficam no armazenamento local. Ao reabrir, a
faixa é preparada em pausa, respeitando as regras de autoplay. Arquivos
locais precisam ser escolhidos novamente; o site não guarda suas permissões
de acesso ao disco nem copia os arquivos para a nuvem.

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

O coletor aceita mensagens do tipo **audio** e documentos com extensão de
música, com contêiner MP3, M4A, OGG ou
WAV reconhecido pelo conteúdo. A implementação limita cada importação a 20 MiB,
de acordo com o limite de download da API de nuvem do Telegram. O contêiner é
validado pelo conteúdo; renomear um programa para `.mp3` não o torna válido.
Mensagens de voz não são importadas automaticamente por este coletor.

## Identificação das faixas

O navegador lê título, artista e álbum dos metadados do arquivo. Um SHA-256
permite reconhecer o mesmo arquivo já presente no catálogo ou na fila local,
mesmo com outro nome. Essa identificação de duplicadas compara bytes, não
gravações acusticamente parecidas.

O coletor também lê metadados internos com Mutagen. Na ausência deles, usa
os campos do Telegram e, por último, o nome do arquivo, registrando o método
usado no catálogo. Isso não constitui reconhecimento pelo som.

Há um adaptador para identificação acústica com Chromaprint/AcoustID. Ele
fica desativado sem o Secret `ACOUSTID_API_KEY`. Para ativá-lo, registre sua
aplicação no serviço e configure essa chave no repositório. O workflow
instalará `fpcalc` somente quando houver chave. Ele envia uma impressão
acústica e duração, sem enviar o arquivo original ao AcoustID. Resultados
ambíguos ou com pontuação baixa não substituem os metadados existentes.

Essa integração depende da base de referência e dos termos do serviço;
não há garantia de reconhecer qualquer música ou trecho ruidoso curto.
A ativação e validação com uma chave própria continuam necessárias.

## Processo contínuo em um host próprio

O agendamento no GitHub permanece ativo por padrão. O código
`integrations/pairbeat_service.py` fornece uma alternativa contínua, com
reinício pelo Docker, espera progressiva após falhas e indicador de saúde.
Ele não está hospedado automaticamente e não transforma um job do Actions
em um servidor permanente.

Para usar essa alternativa em um servidor que fique ligado:

1. Prepare as variáveis no gerenciador de segredos do host. O modelo está em
   `deploy/pairbeat.env.example`; nunca inclua valores reais em um commit.
2. Use uma credencial restrita ao repositório para o processo externo, com
   escrita de Contents e Actions e leitura de Variables. O token temporário
   de um job do Actions não serve como credencial permanente do host.
3. Defina a variável do repositório `PAIRBEAT_RUN_MODE=continuous`. O coletor
   agendado passará a ignorar os ciclos, para não disputar o mesmo bot.
4. Suba **uma única instância**:

```sh
docker compose -f deploy/compose.pairbeat.yml up -d --build
docker compose -f deploy/compose.pairbeat.yml logs --tail=30
```

Os Secrets já existentes não podem ser recuperados em texto pela API do
GitHub. Use a gestão de segredos da implantação para injetar os mesmos
valores no host. Alterar `PAIRBEAT_OWNER_KEY` exige refazer o vínculo do
proprietário; não substitua essa chave durante uma migração normal.

Para voltar aos ciclos do GitHub, pare primeiro o serviço e remova a
variável `PAIRBEAT_RUN_MODE` ou use o valor `scheduled`. O serviço contínuo
verifica esse modo e para quando ele não está habilitado.

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
python -m pip install --require-hashes -r integrations/requirements.txt
python -m unittest discover -s tests -p "test_*.py"
node --test tests/atlas.test.mjs tests/music.test.mjs
```

Os testes cobrem vínculo, remetentes não autorizados, duplicações, limites de
arquivo, caminhos inválidos, preservação de webhook, falha de download e
recuperação após falhas de gravação ou publicação. Não enviam mensagens reais.
Os testes de DOM usam um player simulado; a decodificação e saída sonora reais
dependem do navegador e do dispositivo. Também são testados continuidade ao
navegar/atualizar o catálogo, controles Media Session, restauração em pausa,
ID3 real e identificação de duplicadas por conteúdo.

O cursor só avança depois que o processamento durável termina. Uma falha
temporária deixa a atualização para nova tentativa. A solicitação de
publicação pendente também é repetida no ciclo seguinte.

Referências: [Telegram Bot API](https://core.telegram.org/bots/api#getfile),
[atualizações do Telegram](https://core.telegram.org/bots/faq#how-do-i-get-updates),
[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
e [disparo de workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
