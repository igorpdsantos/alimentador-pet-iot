// Modelo de credenciais. Copie para secrets.h (que fica fora do git) e preencha.
// Ver specs/04-firmware.md §9.
#pragma once

#define MQTT_HOST "xxxxxxxx.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_USER "usuario-do-dispositivo"
#define MQTT_PASS "senha-do-dispositivo"

// Senha para regravar o firmware pelo Wi-Fi (OTA)
#define OTA_PASS "troque-esta-senha"
