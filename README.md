# Bible Study

Aplicacao web para estudo biblico que centraliza o texto da Biblia, comentarios academicos e anotacoes pessoais em uma unica interface.

Combina quatro traducoes da Biblia (NAA, NVI, ACF, KJV) com o comentario do **IVP Bible Background Commentary** (Craig Keener para o NT, John Walton/Victor Matthews para o AT), preservando a formatacao original do PDF (negrito e italico).

## Funcionalidades

- **66 livros** — Antigo e Novo Testamento completos
- **4 traducoes** — NAA, NVI, ACF e KJV, com aba de comparacao lado a lado
- **Comentario academico** — extraido dos PDFs do IVP Commentary com formatacao (negrito/italico)
- **Anotacoes pessoais** — editor rich text (negrito, italico, titulos, listas, citacoes) com salvamento automatico
- **Introducoes por livro** — contexto historico e autoral de cada livro biblico
- **Texto corrido** — versiculos exibidos como texto fluido, com destaque ao passar o mouse
- **Painel lateral redimensionavel** — arraste a borda para ajustar o tamanho
- **Navegacao por teclado** — setas esq/dir para capitulos, cima/baixo para versiculos
- **Responsivo** — funciona em desktop e celular
- **Tema claro** — fundo creme suave com destaques em roxo/lavanda

## Pre-requisitos

- [Node.js](https://nodejs.org/) v18+
- Os PDFs do IVP Bible Background Commentary (NT e OT) para a etapa de extracao

## Instalacao

```bash
# Instalar dependencias
npm install

# Baixar as traducoes da Biblia (multiplataforma)
node download-bibles.js

# Montar o texto biblico (gera public/data/bible.json)
node build-bible.js
```

Com isso o app ja funciona com o **texto biblico + suas anotacoes**. O comentario
(a "biblia de estudos") e opcional e plugavel — veja a secao abaixo.

## Biblias de estudo (comentario)

O texto biblico e o **comentario** sao camadas separadas. Cada pessoa pode plugar a
propria biblia de estudos e alternar entre varias por um seletor no topo do app. O
comentario nao vai no git (e material protegido) — cada um gera o seu localmente.

Passo a passo completo (incluindo o formato/"contrato" de saida do parser):
**[`commentaries/README.md`](commentaries/README.md)**.

Resumo:

```bash
# 1. Extrair o texto do PDF preservando negrito/italico (ajuste o caminho no script)
node extract-formatted.js

# 2. Parsear no formato do contrato (adapte ao layout do seu PDF)
node parse-formatted.js     # NT (base)
node parse-ot-fmt.js         # AT (base)

# 3. Registrar a biblia em commentaries/<id>.js e montar
node build-commentary.js <id>
```

A biblia escolhida fica salva no navegador; o catalogo (`public/data/catalog.json`)
e regenerado automaticamente a cada `build-commentary`.

## Uso

```bash
node server.js
```

Acesse **http://localhost:3000** no navegador.

As anotacoes sao salvas como arquivos na pasta `notes/` — faca backup desta pasta para nao perder seus dados.

## Estrutura do projeto

```
bible-study/
  server.js              # Servidor HTTP + API de notas
  books-meta.js          # Metadados dos 66 livros (compartilhado pelos builds)
  download-bibles.js     # Baixa as 4 traducoes para bibles/
  build-bible.js         # Gera public/data/bible.json (so o texto)
  build-commentary.js    # Gera public/data/commentary-<id>.json + catalog.json
  commentaries/
    README.md             # Como adicionar sua propria biblia de estudos (contrato)
    *.example.js          # Template de configuracao de uma biblia
    <id>.js               # Sua config (ignorada pelo git)
  public/
    index.html            # Interface completa (HTML + CSS + JS)
    data/
      bible.json          # Texto biblico (gerado)
      commentary-<id>.json # Comentario de cada biblia de estudos (gerado)
      catalog.json        # Lista de biblias disponiveis (gerado)
  notes/                  # Anotacoes pessoais (salvas como HTML)
  bibles/                 # JSONs das traducoes (baixados)
  extract-formatted.js    # Extracao dos PDFs com formatacao
  parse-formatted.js      # Parser do comentario NT (base, adaptavel)
  parse-ot-fmt.js         # Parser do comentario AT (base, adaptavel)
  prepare-data.js         # (DEPRECATED) antigo build unificado
```

## Fontes de dados

- **Traducoes em portugues (NAA, NVI, ACF):** [damarals/biblias](https://github.com/damarals/biblias)
- **KJV:** [thiagobodruk/bible](https://github.com/thiagobodruk/bible)
- **Comentario NT:** *The IVP Bible Background Commentary: New Testament* — Craig S. Keener (2nd ed., 2014)
- **Comentario AT:** *The IVP Bible Background Commentary: Old Testament* — John H. Walton, Victor H. Matthews, Mark W. Chavalas (2000)
