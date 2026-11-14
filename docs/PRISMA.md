# Prisma no KONAET Atlas

A referência fornecida foi `Prisma Pack.html`, com seis quadros. A adaptação usa a estrutura de interação, os materiais, o gradiente cônico e a projeção do toro do arquivo. Os componentes são implementados como HTML, CSS e JavaScript locais, sem o runtime de prévia do documento original.

| Quadro | Aplicação no Atlas |
| --- | --- |
| Fundamentos | Inter, Space Grotesk e JetBrains Mono; superfícies plana, elevada, escavada, vidro e refrativa; elevação, raio, cores, tamanho e fonte ajustáveis. |
| Controles físicos | Botões com relevo e pressão, interruptores, ranges, volume giratório, campos com validação, preset local e processo em cinco passos. |
| Refrativo | Bordas com o espectro do pack, luz no cursor, rotação ou ângulo fixo, brilho e espessura, pílula para salvar o projeto, navegação em pílula, botões circulares, cartão de vidro e dock com elevação. |
| Dados e 3D | Toro de partículas com projeção e fluxos do pack, modos esfera e onda, velocidade, densidade e pausa. Métricas do acervo e linguagens são dados do Atlas; velas, latência, livro de ofertas, mensagens, fita e cone formam uma simulação visual identificada. |
| HUD | Grade hexagonal de 42 células com seis ferramentas, sequência executável, contagem, parar, limpar e restaurar; três molduras em seis cores; barras e medidor radial; inventário e equipamento; habilidades com cinco pontos redistribuíveis. |
| Feedback | Lista com seleção múltipla e salvamento real, etiquetas, perfil, tabelas, quatro tipos de aviso fecháveis, confirmação de restauração, consulta real do acervo com progresso e estado vazio com navegação. |

Os ajustes compartilhados ficam em `konaet.atlas.prisma` no armazenamento do navegador. Presets podem ser salvos, carregados e exportados/importados em JSON; a importação aceita somente as propriedades conhecidas e valida os valores. As referências e o player continuam usando o estado do Atlas.

As animações param quando a aba fica oculta. O motor de partículas só desenha a cena da área aberta, e oferece pausa manual. A preferência do sistema por movimento reduzido é respeitada. O circuito para ao sair do HUD. A navegação, os sliders e os diálogos também funcionam com teclado.

As fontes latinas foram extraídas sem alterações do pack fornecido; os avisos e as licenças OFL acompanham os arquivos em `assets/prisma/FONT-LICENSES.txt`. A distribuição não precisa buscar fontes ou scripts de terceiros.

## Arquivos

- `site/prisma.css`: materiais e componentes do pack aplicados a todas as áreas.
- `site/prisma.js`: preferências, diálogos, áudio, presets, HUD e feedback.
- `site/prisma-scenes.js`: projeção e animação das partículas.
- `site/prisma-terminal.js`: demonstração sintética do terminal.
- `tests/prisma.test.mjs`: comportamento dos componentes e do motor de partículas.
