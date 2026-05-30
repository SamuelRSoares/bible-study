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

# Baixar as traducoes da Biblia
mkdir -p bibles
curl -L -o bibles/NAA.json "https://raw.githubusercontent.com/damarals/biblias/main/inst/json/NAA.json"
curl -L -o bibles/NVI.json "https://raw.githubusercontent.com/damarals/biblias/main/inst/json/NVI.json"
curl -L -o bibles/ACF.json "https://raw.githubusercontent.com/damarals/biblias/main/inst/json/ACF.json"
curl -L -o bibles/KJV.json "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json"
```

## Extracao dos comentarios

Os scripts de extracao processam os PDFs do IVP Commentary e geram JSONs estruturados por livro/capitulo/versiculo. Edite os caminhos dos PDFs nos scripts conforme necessario.

```bash
# 1. Extrair texto dos PDFs (preservando negrito/italico)
node extract-formatted.js

# 2. Parsear o texto em estrutura por versiculo
node parse-formatted.js     # NT
node parse-ot-fmt.js         # AT

# 3. Montar o JSON unificado do app
node prepare-data.js
```

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
  public/
    index.html            # Interface completa (HTML + CSS + JS)
    data/
      app-data.json       # Dados unificados (gerado por prepare-data.js)
  notes/                  # Anotacoes pessoais (salvas como HTML)
  bibles/                 # JSONs das traducoes (baixados)
  extract-formatted.js    # Extracao dos PDFs com formatacao
  parse-formatted.js      # Parser do comentario NT
  parse-ot-fmt.js         # Parser do comentario AT
  prepare-data.js         # Unifica biblia + comentario em app-data.json
```

## Fontes de dados

- **Traducoes em portugues (NAA, NVI, ACF):** [damarals/biblias](https://github.com/damarals/biblias)
- **KJV:** [thiagobodruk/bible](https://github.com/thiagobodruk/bible)
- **Comentario NT:** *The IVP Bible Background Commentary: New Testament* — Craig S. Keener (2nd ed., 2014)
- **Comentario AT:** *The IVP Bible Background Commentary: Old Testament* — John H. Walton, Victor H. Matthews, Mark W. Chavalas (2000)
