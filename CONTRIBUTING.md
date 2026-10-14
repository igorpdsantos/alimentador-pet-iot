# Como contribuir

Sugestões, correções e fotos de montagens são bem-vindas! Abra uma *issue* ou um *pull request*.

## Regras do projeto

- **As specs são a fonte da verdade** ([`specs/`](specs/)). Mudou o comportamento? Atualize a spec no mesmo PR.
  Decisões novas entram na tabela de [`specs/README.md`](specs/README.md).
- **Contrato MQTT**: mudança em tópico ou payload exige atualizar juntos `specs/05-protocolo-mqtt.md`, firmware,
  app, simulador e `tools/protocol-fixtures/`.
- **Modelo 3D**: as peças são geradas por `cad/scripts/gerar_v3.py`. Mude o script (não o `.FCStd` à mão),
  gere de novo, exporte as peças e confira um render. Mudou peça, parafuso, pino ou preço? Atualize `docs/` junto.
- **Medidas não confirmadas** ficam marcadas como "medir" — não invente um valor como se tivesse sido medido.
- **Segurança do pet**: nada de ponta ou aresta viva ao alcance do animal; nada de plástico fino que possa soltar
  lasca na ração; o rotor nunca gira sem limite de tempo e o boot sempre o deixa parado.
- **Segredos** (`firmware/include/secrets.h`, `app/.env`) nunca entram no git; mantenha os arquivos de exemplo.
- **Idioma**: documentação, textos do app e commits em português do Brasil; nomes no código em inglês.

## Verificação antes do PR

| Área | Comandos |
|---|---|
| Firmware | `pio test -e native` e `pio run` |
| App | `npx tsc --noEmit` e `npx jest` |
| Modelo 3D | gerar, exportar e conferir o render |
| Site | `python3 site/gerar_site.py` e abrir `http://localhost:8765` (ver `site/README.md`) |
