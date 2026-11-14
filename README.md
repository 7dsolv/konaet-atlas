# KONAET Atlas

[**Abrir o Atlas →**](https://7dsolv.github.io/konaet-atlas/) · [Perfil de 7dsolv](https://github.com/7dsolv)

Projetos, código e pesquisa de Adilson Oliveira com o sistema visual e os componentes do Prisma Pack: vidro, controles físicos, bordas refrativas e movimento. A seleção inicial reúne oito projetos; a busca também pode percorrer o acervo público do GitHub. O mapa oferece dez relações temáticas, um toro animado de partículas, busca, filtros, foco, zoom e navegação por teclado. As linhas representam afinidades editoriais, não dependências técnicas. Há biblioteca de PDFs, temas claro/escuro e referências salvas no dispositivo.

A área **Prisma** reúne os seis quadros completos adaptados ao Atlas: fundamentos, controles físicos, refrativo, dados e 3D, HUD de jogo e feedback. A aparência, a luz e o movimento são compartilhados com o restante do site. Inclui presets locais com exportação/importação, slider para salvar referências, volume do player, circuito hexagonal editável e executável, inventário e habilidades. O terminal do pack usa dados explicitamente fictícios para demonstrar velas, latência, ofertas, mensagens, fita e funil. As métricas do acervo usam os repositórios carregados. Consulte [a adaptação do pack](docs/PRISMA.md).

A área [Música](https://7dsolv.github.io/konaet-atlas/#music) permite ouvir arquivos locais, um estudo original de demonstração e faixas publicadas pelo PairBeat após vincular o proprietário. Veja [o fluxo, a configuração e os limites](docs/PAIRBEAT.md). A interface tem temas branco/preto de alto contraste, navegação com rótulos maiores e um mapa adaptado para celular.

O player fica fixo enquanto você navega pelo Atlas. O catálogo do Telegram é atualizado automaticamente, sem reiniciar a reprodução. Arquivos locais têm título/artista lidos dos metadados e duplicadas verificadas pelo conteúdo. A reprodução termina ao fechar a aba do Atlas; ao reabrir, a última faixa pública fica pronta para continuar com um toque em play.

O portal é publicado no **GitHub Pages**, a partir deste repositório público. A página funciona como aplicação estática, sem conta, servidor de IA ou credenciais. Os desenhos são estudos visuais dos projetos; o estado e os resultados de cada projeto estão nos respectivos repositórios.

## Executar no computador

Requer Python 3.12 ou posterior:

```sh
python scripts/build_studio.py
python scripts/check_atlas.py
python -m http.server 8080 --directory dist
```

Abra **http://localhost:8080**. Sirva a pasta por HTTP: abrir `index.html` diretamente como arquivo local não permite carregar os dados JSON em todos os navegadores.

Para renovar os dados públicos antes de compilar:

```sh
python scripts/build_studio.py --refresh
```

O botão **Atualizar acervo** consulta a API pública do GitHub. Se a API ficar indisponível ou atingir o limite de consultas, o conjunto de dados incluído na publicação continua disponível. Os salvos e a preferência de tema são armazenados apenas no navegador que os criou.

## Verificar

Os testes de comportamento usam Node.js 24.22.2 e Happy DOM 21.0.4 fixado no lockfile:

```sh
cd tests
npm ci --ignore-scripts --no-audit --no-fund
node --test atlas.test.mjs music.test.mjs prisma.test.mjs
```

Cobrem seleção e links dos projetos, busca e categorias, navegação, salvos, zoom, tema, biblioteca, recuperação de falhas, preferências Prisma, o circuito, inventário, habilidades, desenho das partículas e simulação do terminal. `scripts/check_atlas.py` verifica os recursos locais, IDs do DOM, SVGs e orçamento de 1,6 MB para toda a distribuição, incluindo PDFs e as três fontes do pack.

Os testes do coletor são executados na raiz, após `python -m pip install --require-hashes -r integrations/requirements.txt`: `python -m unittest discover -s tests -p "test_*.py"`. Não requerem credenciais e não fazem chamadas reais ao Telegram. Consulte também [as dependências de áudio](docs/AUDIO-DEPENDENCIES.md).

Os testes de DOM verificam comportamento; não substituem inspeção visual em um navegador real. O layout tem adaptações para celular, tablet e computador, foco visível e preferências de redução de movimento e transparência.

## Publicar no GitHub

O workflow [pages.yml](.github/workflows/pages.yml) executa os testes, compila `dist/`, verifica os arquivos e publica o mesmo artefato no GitHub Pages. A publicação depende da aprovação das verificações. Pull requests executam as verificações sem publicar.

As Actions são fixadas por hash de commit. O workflow usa permissões de leitura de código durante a validação; somente a publicação recebe `pages: write` e `id-token: write`. Nenhum token pessoal é enviado ao navegador.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `site/` | Interface, seleção de projetos e dados públicos |
| `assets/studio/` | Desenhos SVG, fonte e avatar público |
| `publications/` | PDFs disponíveis no caderno |
| `scripts/` | Compilação, desenho e verificação |
| `tests/` | Testes de comportamento |

Para regenerar os desenhos vetoriais: `python scripts/draw_studio.py`. O traço é determinístico, sem bibliotecas gráficas externas. A fonte Manrope é distribuída sob SIL Open Font License 1.1; consulte [a procedência](docs/FONT-PROVENANCE.md) e [a licença](assets/studio/FONT-LICENSE.txt).
