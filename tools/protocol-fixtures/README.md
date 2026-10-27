# Exemplos do contrato MQTT

Um arquivo JSON para cada mensagem de [`specs/05-protocolo-mqtt.md`](../../specs/05-protocolo-mqtt.md):
comandos (`cmd_*`), respostas (`resp_*`), `status`, `config` e eventos (`event_*`). Em `invalid/` ficam comandos
que o firmware tem que recusar com `INVALID_ARGS`.

Os mesmos arquivos são usados pelos testes do firmware (`firmware/test/test_protocol`, que monta as mensagens e
compara com estes) e do app (`app/src/protocol/protocol.test.ts`, que valida com os schemas zod). Mudou o contrato?
Atualize aqui primeiro e rode os dois lados.
