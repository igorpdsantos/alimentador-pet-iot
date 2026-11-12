// Modelo de credenciais. Copie para secrets.h (que fica fora do git) e preencha.
// Ver specs/04-firmware.md §9.
#pragma once

#define MQTT_HOST "xxxxxxxx.ala.us-east-1.emqxsl.com"
#define MQTT_PORT 8883

// Parte secreta do código de pareamento (D24): o código é pf-xxxxxx-<isto>, impresso no QR da etiqueta.
// No broker, crie o usuário pf-xxxxxx (o device_id) com esta senha; o alimentador e o app usam esse usuário.
// 8 a 32 letras minúsculas/números. Gere uma aleatória, ex.:
//   python3 -c "import secrets;print(''.join(secrets.choice('23456789abcdefghjkmnpqrstuvwxyz') for _ in range(10)))"
#define PAIR_SECRET "troque-isto"

// Senha da rede de configuração "Alimentador-xxxxxx" (8 a 63 caracteres). Imprima na etiqueta do alimentador,
// junto do QR com o código pf-xxxxxx-segredo. Ver docs/seguranca.md.
#define PORTAL_PASS "troque-esta-senha"

// Senha para regravar o firmware pelo Wi-Fi (OTA)
#define OTA_PASS "troque-esta-senha"
