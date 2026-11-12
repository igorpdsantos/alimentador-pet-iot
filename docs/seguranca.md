# Segurança

Quem pode controlar o alimentador, o que o app e o ESP32 conseguem (e não conseguem) fazer na sua rede, e os
cuidados que o grupo precisa ter. Contrato de comunicação em [`specs/05-protocolo-mqtt.md`](../specs/05-protocolo-mqtt.md).

## 1. Como a comunicação funciona

```
App (navegador do celular) ──wss://…:8084──►   EMQX Cloud   ◄──mqtts://…:8883── ESP32 (Wi-Fi de casa)
                         TLS + código do        (broker)      TLS + código do
                         alimentador                          alimentador
```

- O app e o alimentador **não conversam direto**: os dois se conectam ao broker MQTT na nuvem (EMQX Cloud Serverless, D23).
  Por isso o app funciona de qualquer lugar, não só no Wi-Fi de casa.
- **Quem controla o alimentador é quem tem o código completo** `pf-xxxxxx-segredo` (D24), de qualquer lugar da
  internet. No broker, cada alimentador tem um usuário próprio: nome `pf-xxxxxx`, senha = a parte secreta. O broker
  só deixa esse usuário nos tópicos `petfeeder/pf-xxxxxx/...`, então um código não alcança outro alimentador.
  Saber só o `pf-xxxxxx` (o nome da rede de configuração mostra parte dele) não basta.
- As duas conexões usam TLS: ninguém na rede (Wi-Fi público, provedor) consegue ler senhas ou comandos.
  O ESP32 confere o certificado do broker (`firmware/include/ca_cert.h`, DigiCert Global Root G2).

## 2. O app publicado

O app em <https://igorpdsantos.github.io/alimentador-pet-iot/app/> é uma página estática:

- **Não leva credencial nenhuma.** O workflow do GitHub Pages embute só o **endereço** do broker (`VITE_MQTT_URL`,
  público). Usuário e senha saem do código do alimentador, digitado no pareamento (ou lido do QR da etiqueta), e
  ficam guardados **só no navegador daquele celular** (`localStorage`).
- O QR da etiqueta abre `…/app/#codigo=pf-xxxxxx-segredo`. O que vem depois do `#` não é enviado ao servidor do
  site: o código não aparece em log de servidor.
- Roda dentro do navegador, que isola cada site: **não consegue** listar os aparelhos da rede, abrir portas em
  outros dispositivos nem acessar arquivos do celular. A única conexão que faz é com o broker informado, trocando
  as mensagens do alimentador (tópicos `petfeeder/...`).
- Câmera: só quando você toca em "Ler o QR da etiqueta", com a permissão do navegador, e desliga ao fechar.
- O código é aberto (`app/`): qualquer um pode conferir o que ele faz.

> Nunca ponha usuário ou senha em `VITE_MQTT_USER`/`VITE_MQTT_PASS` para publicar. Tudo que começa com `VITE_`
> fica embutido no app e **visível para qualquer pessoa** que abrir a página. Só o endereço (`VITE_MQTT_URL`) pode.

## 3. O alimentador (ESP32) na rede de casa

| O que fica exposto | Quem alcança | Proteção |
|---|---|---|
| Conexão de saída para o broker | — (ele que conecta) | TLS + usuário `pf-xxxxxx` / `PAIR_SECRET` |
| Atualização pelo Wi-Fi (OTA, porta 3232) | Só quem já está no Wi-Fi de casa | Senha `OTA_PASS` em `secrets.h` |
| Rede de configuração "Alimentador-xxxxxx" (portal) | Quem estiver por perto e souber a senha | Senha WPA2 `PORTAL_PASS` (na etiqueta) |

- O firmware não tem nenhuma função para acessar outros aparelhos da rede. Para virar ferramenta de ataque, alguém
  teria que **regravar o firmware**: com a senha de OTA (estando no seu Wi-Fi) ou com o cabo USB na placa.
  É o mesmo risco de qualquer aparelho "inteligente" da casa.
- O portal de configuração só aparece no primeiro uso, quando o Wi-Fi salvo não conecta, ou depois de segurar o
  BOOT por 10 s. Ele não mostra a senha do Wi-Fi já salva.

## 4. Se alguém conseguir o código do alimentador

Poderia mandar comandos ao alimentador (servir, mudar a agenda, calibrar). O firmware limita o estrago:

- no máximo **200 g por comando** e nunca enche a vasilha além de `max_bowl_g`;
- cada giro do rotor dura no máximo 1,5 s e cada refeição no máximo 90 s;
- comandos repetidos com o mesmo `req_id` não são executados duas vezes.

Não daria acesso ao Wi-Fi de casa, aos outros aparelhos nem a outros alimentadores. Resolve-se trocando a parte
secreta: novo `PAIR_SECRET` em `secrets.h`, mesma senha no usuário `pf-xxxxxx` do EMQX, regravar a placa,
imprimir etiqueta nova e parear de novo.

## 5. Pontos fracos conhecidos

| Ponto | Risco | Situação |
|---|---|---|
| Rede de configuração | Alguém por perto, com o portal aberto, configurava o alimentador em outra rede | **Resolvido** (D21, 27/10/2026): rede com senha WPA2 `PORTAL_PASS`, impressa na etiqueta. O firmware não compila com senha de menos de 8 caracteres. Quem vê a etiqueta (visita em casa) ainda consegue entrar enquanto o portal estiver aberto |
| Senha de OTA fraca | Quem já está no seu Wi-Fi regrava o firmware | Usar senha forte em `OTA_PASS` |
| ESP32 publica com QoS 0 | Mensagem pode se perder numa queda de rede (não é falha de segurança) | O app recupera pelo histórico ao reconectar |
| Credencial do app guardada no navegador | Quem pegar o celular desbloqueado usa o app | Igual a qualquer app logado; "Desparear" em Ajustes apaga |
| Etiqueta com o código colada no alimentador | Visita em casa fotografa e passa a controlar de fora | Aceito: é o mesmo nível de uma senha de Wi-Fi na geladeira. Se preocupar, cole a etiqueta por dentro da tampa ou troque o segredo (§4) |

## 6. Checklist do grupo

1. Gere um `PAIR_SECRET` aleatório (comando em `secrets.example.h`) em `firmware/include/secrets.h`.
2. No EMQX Cloud, **Access Control → Authentication**: crie o usuário `pf-xxxxxx` (o `device_id`) com a senha
   `PAIR_SECRET`. Um usuário por alimentador; não crie usuários genéricos.
3. **Access Control → Authorization**, para o usuário `pf-xxxxxx`, nesta ordem: **Allow** publish e subscribe em
   `petfeeder/pf-xxxxxx/#`; **Deny** publish e subscribe em `#`. Confira que o usuário não consegue assinar
   `petfeeder/#`.
4. Defina uma `OTA_PASS` forte e uma `PORTAL_PASS` (8+ caracteres) antes de gravar a placa; não use a mesma senha
   do Wi-Fi de casa. Gere a etiqueta (`tools/etiqueta/gerar_etiqueta.py`), que leva a `PORTAL_PASS` e o código.
5. Não versionar `secrets.h` nem `.env` (o `.gitignore` já impede); conferir `git status` antes de cada commit.
6. Se o código vazar: troque o segredo (§4). Se a `PORTAL_PASS` vazar: troque em `secrets.h`, regrave e imprima
   etiqueta nova.
