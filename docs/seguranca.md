# Segurança

Quem pode controlar o alimentador, o que o app e o ESP32 conseguem (e não conseguem) fazer na sua rede, e os
cuidados que o grupo precisa ter. Contrato de comunicação em [`specs/05-protocolo-mqtt.md`](../specs/05-protocolo-mqtt.md).

## 1. Como a comunicação funciona

```
App (navegador do celular) ──wss://…:8884──►  HiveMQ Cloud  ◄──mqtts://…:8883── ESP32 (Wi-Fi de casa)
                         TLS + usuário/senha    (broker)      TLS + usuário/senha
```

- O app e o alimentador **não conversam direto**: os dois se conectam ao broker MQTT na nuvem (HiveMQ Cloud).
  Por isso o app funciona de qualquer lugar, não só no Wi-Fi de casa.
- **Quem controla o alimentador é quem tem o usuário e a senha do broker**, de qualquer lugar da internet.
  Saber o código `pf-xxxxxx` não basta.
- As duas conexões usam TLS: ninguém na rede (Wi-Fi público, provedor) consegue ler senhas ou comandos.
  O ESP32 confere o certificado do broker (`firmware/include/ca_cert.h`, ISRG Root X1).

## 2. O app publicado

O app em <https://igorpdsantos.github.io/alimentador-pet-iot/app/> é uma página estática:

- **Não leva credencial nenhuma.** O workflow do GitHub Pages compila sem `.env`; o endereço, usuário e senha do
  broker são digitados no pareamento e ficam guardados **só no navegador daquele celular** (`localStorage`).
- Roda dentro do navegador, que isola cada site: **não consegue** listar os aparelhos da rede, abrir portas em
  outros dispositivos nem acessar arquivos do celular. A única conexão que faz é com o broker informado, trocando
  as mensagens do alimentador (tópicos `petfeeder/...`).
- Câmera: só quando você toca em "Ler o QR da etiqueta", com a permissão do navegador, e desliga ao fechar.
- O código é aberto (`app/`): qualquer um pode conferir o que ele faz.

> Nunca crie `app/.env` para publicar. Tudo que começa com `VITE_` fica embutido no app e **visível para qualquer
> pessoa** que abrir a página. O `.env` só serve para desenvolvimento local.

## 3. O alimentador (ESP32) na rede de casa

| O que fica exposto | Quem alcança | Proteção |
|---|---|---|
| Conexão de saída para o broker | — (ele que conecta) | TLS + usuário/senha |
| Atualização pelo Wi-Fi (OTA, porta 3232) | Só quem já está no Wi-Fi de casa | Senha `OTA_PASS` em `secrets.h` |
| Rede de configuração "Alimentador-xxxxxx" (portal) | Quem estiver por perto | **Sem senha** — ver §5 |

- O firmware não tem nenhuma função para acessar outros aparelhos da rede. Para virar ferramenta de ataque, alguém
  teria que **regravar o firmware**: com a senha de OTA (estando no seu Wi-Fi) ou com o cabo USB na placa.
  É o mesmo risco de qualquer aparelho "inteligente" da casa.
- O portal de configuração só aparece no primeiro uso, quando o Wi-Fi salvo não conecta, ou depois de segurar o
  BOOT por 10 s. Ele não mostra a senha do Wi-Fi já salva.

## 4. Se alguém conseguir a senha do broker

Poderia mandar comandos ao alimentador (servir, mudar a agenda, calibrar). O firmware limita o estrago:

- no máximo **200 g por comando** e nunca enche a vasilha além de `max_bowl_g`;
- cada giro do rotor dura no máximo 1,5 s e cada refeição no máximo 90 s;
- comandos repetidos com o mesmo `req_id` não são executados duas vezes.

Não daria acesso ao Wi-Fi de casa nem aos outros aparelhos. Resolve-se trocando a senha no HiveMQ.

## 5. Pontos fracos conhecidos

| Ponto | Risco | Situação |
|---|---|---|
| Rede de configuração sem senha | Alguém por perto, no momento em que o portal está aberto, entra e configura o alimentador em outra rede (atrapalha, mas não acessa a sua) | **Em aberto** (A6 em `specs/README.md`): pôr senha no portal, impressa na etiqueta junto do QR |
| Senha de OTA fraca | Quem já está no seu Wi-Fi regrava o firmware | Usar senha forte em `OTA_PASS` |
| ESP32 publica com QoS 0 | Mensagem pode se perder numa queda de rede (não é falha de segurança) | O app recupera pelo histórico ao reconectar |
| Credencial do app guardada no navegador | Quem pegar o celular desbloqueado usa o app | Igual a qualquer app logado; "Desparear" em Ajustes apaga |

## 6. Checklist do grupo

1. No HiveMQ Cloud, crie **dois usuários**: um para o ESP32 e outro para o app. Senhas fortes (16+ caracteres).
2. Restrinja os dois ao tópico `petfeeder/#` (permissões do HiveMQ).
3. Senha do ESP32 só em `firmware/include/secrets.h` (fora do git). Senha do app só digitada no pareamento.
4. Defina uma `OTA_PASS` forte antes de gravar a placa.
5. Não versionar `secrets.h` nem `.env` (o `.gitignore` já impede); conferir `git status` antes de cada commit.
6. Se uma senha vazar: troque no HiveMQ e pareie de novo (app) ou regrave o `secrets.h` (ESP32).
