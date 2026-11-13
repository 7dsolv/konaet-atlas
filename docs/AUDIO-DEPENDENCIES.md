# Dependências de áudio

## Navegador

`site/vendor/jsmediatags.min.js` é a distribuição original de
**jsmediatags 3.9.7**, por António Afonso e demais autores indicados na licença
BSD de três cláusulas. O arquivo não foi alterado.

- Origem: https://github.com/aadsm/jsmediatags
- Pacote: https://www.npmjs.com/package/jsmediatags/v/3.9.7
- Distribuição: https://cdn.jsdelivr.net/npm/jsmediatags@3.9.7/dist/jsmediatags.min.js
- SHA-256: `9eeafeb1eedf87642384ec026a35a387ff36c0f6bb7048c292c79cab03c1b3a9`
- Licença incluída em `site/vendor/jsmediatags-LICENSE.md`

A biblioteca lê metadados de arquivos escolhidos pelo visitante. O arquivo
local não é enviado ao Telegram ou a um serviço de reconhecimento.

## Coletor

`integrations/requirements.txt` fixa **Mutagen 1.48.1** com o hash SHA-256 do
wheel publicado no PyPI. O pacote não tem dependências transitivas.

- Projeto: https://github.com/quodlibet/mutagen
- Documentação: https://mutagen.readthedocs.io/
- Distribuição e licença: https://pypi.org/project/mutagen/1.48.1/

O reconhecimento acústico opcional usa o executável `fpcalc` do Chromaprint
e o serviço AcoustID, com chave própria da aplicação. O projeto não utiliza
as chaves temporárias dos exemplos da documentação.

- Chromaprint: https://github.com/acoustid/chromaprint
- AcoustID: https://acoustid.org/webservice
