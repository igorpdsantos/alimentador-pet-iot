# Site do projeto

Página estática (HTML + CSS + JS, sem build) com o modelo 3D interativo, as peças para imprimir, a lista de compras,
o passo a passo de montagem, o manual e o estudo de engenharia. Tudo é gerado a partir da documentação (`docs/`,
`specs/`) e do CAD (`cad/`), então o site nunca fica desatualizado em relação ao projeto.

## Ver no computador

```bash
python3 -m http.server 8765 --directory site
```

Abrir `http://localhost:8765`. (Abrir o `index.html` direto do disco não carrega o modelo 3D: o navegador bloqueia.)

## Atualizar depois de mudar o projeto

| Mudou | Rodar (da raiz do projeto) |
|---|---|
| Documentação (`docs/`, `specs/README.md`) | `python3 site/gerar_site.py` |
| Peças (STL em `cad/impressao_v3/`) | `python3 site/gerar_site.py` |
| Geometria do modelo (peças do v3 + componentes, fios e texturas da montagem detalhada) | `freecadcmd site/ferramentas/exportar_glb.py` → `npx @gltf-transform/cli@4.1.1 meshopt site/modelo/alimentador.glb site/modelo/alimentador.min.glb` → apagar `alimentador.glb` → `python3 site/gerar_site.py` |
| Imagens (renders) | no console Python do FreeCAD: `exec(open("site/ferramentas/renderizar_imagens.py").read())` → `python3 site/ferramentas/aparar_imagens.py` → `python3 site/gerar_site.py` |

Dependências: `pip install markdown pillow`; FreeCAD 1.1 (para STEP, GLB e imagens); Node (só para comprimir o GLB).

## Publicar no GitHub Pages

Automático: o workflow `.github/workflows/pages.yml` publica a pasta `site/` a cada push na `main` que mexe nela
(Settings → Pages → Source: *GitHub Actions*). Endereço: <https://igorpdsantos.github.io/alimentador-pet-iot/>.

## Estrutura

```
site/
  index.html            gerado (não editar à mão) — editar modelo.html
  modelo.html           estrutura da página; %%DADOS%% recebe os dados do gerador
  estilo.css            visual (tema escuro/claro)
  app.js                modelo 3D (three.js), simulação da refeição, peças, compras, montagem, gráfico
  gerar_site.py         gera index.html e arquivos/
  modelo/               alimentador.min.glb (modelo 3D comprimido)
  img/                  renders do conjunto e miniaturas das peças
  arquivos/             downloads: STL/3MF, ZIPs, STEP (gerados)
  ferramentas/          exportar_glb.py, renderizar_imagens.py, aparar_imagens.py
```
