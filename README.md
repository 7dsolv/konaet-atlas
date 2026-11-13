# KONAET Atlas

Portal pessoal de Adilson Oliveira (`7dsolv`): mapa de projetos, índice pesquisável, biblioteca e referências salvas no dispositivo, em uma interface de vidro translúcido.

**Publicado:** https://konaet-atlas-7dsolv.konyesty58.chatgpt.site

Este repositório mantém a fonte privada. A interface publicada, os arquivos enviados ao navegador e as imagens visíveis podem ser inspecionados e copiados por visitantes. A privacidade do repositório não constitui proteção contra cópia da aparência.

## Executar localmente

Requer Python 3.12 ou posterior. A aplicação é estática e não precisa de servidor de IA nem credenciais.

```text
python scripts/build_studio.py
python scripts/check_atlas.py
python -m http.server 8080 --directory dist
```

Abra http://localhost:8080. Para atualizar a fotografia dos repositórios públicos antes da compilação, execute `python scripts/build_studio.py --refresh`. O botão de consulta da interface também busca dados públicos; quando a API estiver indisponível, o retrato publicado permanece utilizável.

## Verificação

Os testes de comportamento usam Node.js 24 e Happy DOM fixado no lockfile:

```text
cd tests
npm ci
node --test atlas.test.mjs
```

Cobrem seleção de projetos, pesquisa/filtros, salvos, zoom, tema/biblioteca e falhas de rede ou armazenamento. A verificação estática confere links locais, IDs do DOM, SVGs, projetos e tamanho dos arquivos. Há inspeção da captura de publicação; testes automatizados de DOM não substituem ensaios em todos os navegadores e dispositivos.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `site/` | Interface e dados públicos selecionados |
| `assets/studio/` | Ilustrações originais e avatar público |
| `publications/` | PDFs acessíveis no portal |
| `scripts/` | Compilação e verificação local |
| `tests/` | Testes de comportamento |

A publicação usa Sites; o repositório público do perfil recebe apenas apresentação, imagem e links. O manifesto e a identidade da hospedagem são mantidos no checkout de publicação separado. Nenhum segredo é necessário no código entregue ao navegador.
