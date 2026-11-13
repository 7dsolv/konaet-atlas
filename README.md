# KONAET Atlas

[**Abrir o Atlas →**](https://7dsolv.github.io/konaet-atlas/) · [Perfil de 7dsolv](https://github.com/7dsolv)

Projetos, código e pesquisa de Adilson Oliveira em uma interface de vidro claro, com desenhos originais em grafite. A seleção inicial reúne oito projetos; a busca também pode percorrer o acervo público do GitHub. Há mapa navegável, biblioteca de PDFs, temas claro/escuro e referências salvas no dispositivo.

A área [Música](https://7dsolv.github.io/konaet-atlas/#music) permite ouvir arquivos locais, um estudo original de demonstração e faixas publicadas pelo PairBeat após vincular o proprietário. Veja [o fluxo, a configuração e os limites](docs/PAIRBEAT.md). A interface tem temas branco/preto de alto contraste, navegação com rótulos maiores e um mapa adaptado para celular.

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
node --test atlas.test.mjs music.test.mjs
```

Cobrem seleção e links dos projetos, busca e categorias, navegação entre áreas, salvos, zoom, tema, biblioteca e recuperação de falhas. `scripts/check_atlas.py` verifica os recursos locais, IDs do DOM, SVGs e orçamento de 1,3 MB para toda a distribuição, incluindo PDFs.

Os testes do coletor são executados na raiz: `python -m unittest discover -s tests -p "test_*.py"`. Não requerem credenciais e não fazem chamadas reais ao Telegram.

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
