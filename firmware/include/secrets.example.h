// Modelo de credenciais. Copie para secrets.h (que fica fora do git) e preencha.
// Ver specs/04-firmware.md §9.
#pragma once

#define MQTT_HOST "xxxxxxxx.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_USER "usuario-do-dispositivo"
#define MQTT_PASS "senha-do-dispositivo"

// Senha da rede de configuração "Alimentador-xxxxxx" (8 a 63 caracteres). Imprima na etiqueta do alimentador,
// junto do QR com o código pf-xxxxxx. Ver docs/seguranca.md.
#define PORTAL_PASS "troque-esta-senha"

// Senha para regravar o firmware pelo Wi-Fi (OTA)
#define OTA_PASS "troque-esta-senha"
