# 07 — Testes e métricas

Resultados vão em `docs/resultados/` (planilha ou CSV + fotos). Cada teste tem um ID para citar na apresentação.

## 1. Testes automatizados

| Onde | O quê | Comando |
|---|---|---|
| Firmware (PC) | Máquina de estados da dosagem com balança simulada; curva de bateria; agenda (virada de dia, dias da semana, refeição perdida); parse/validação de comandos e `req_id` repetido | `cd firmware && pio test -e native` |
| App | Schemas zod contra exemplos de 05-protocolo; cliente MQTT (req_id, timeout, lixo descartado); histórico local; métricas; telas principais | `cd app && npx vitest run` |
| Integração | App ↔ simulador com broker local | `node tools/simulador/simulador.mjs --local` + `cd app && npm run dev` |

Os exemplos JSON de 05-protocolo ficam também em `tools/protocol-fixtures/*.json` e são usados pelos
testes dos dois lados — garante que firmware e app concordam com o contrato.

## 2. Testes de bancada (hardware)

| ID | Teste | Procedimento | Critério de aceite |
|----|-------|--------------|--------------------|
| T-CAL | Linearidade da balança | Pesar 0, 100, 200, 500, 1000 g conhecidos | Erro ≤ 2 g em toda a faixa |
| T-DRF | Deriva | Plataforma com vasilha parada por 2 h, ler a cada 5 min | Variação ≤ 3 g |
| T-VAZ | Vazão da comporta | 20 pulsos de 200 ms, medir g/pulso | Registrar média e desvio → valor inicial de `flow_g_per_ms` |
| T-DOS | **Precisão da dose** | 10 refeições de 20 g, 10 de 50 g, 10 de 100 g | Erro médio ≤ 5 %, nenhuma > 10 % |
| T-FLX | Escoamento / entupimento | Reservatório cheio → vazio em refeições de 50 g | Nenhum `NO_FLOW` com ração disponível |
| T-JAM | **Vários tamanhos de grão** | Repetir T-DOS e T-FLX com ração de gato (~6 mm), cão pequeno (~10 mm) e cão grande (~18–22 mm) | Nenhum travamento permanente; registrar quantas vezes a rotina de destravar agiu |
| T-VAZIO | Reservatório vazio | Dosar com reservatório vazio | Status `NO_FLOW` em ≤ 25 s, rotor parado |
| T-VAS | Vasilha ausente | Tirar a vasilha e mandar alimentar | `BOWL_MISSING`, servo não se move |
| T-AGD | Agenda | 3 refeições em horários próximos; desligar Wi-Fi do roteador antes da 2ª | As 3 são servidas; histórico sincroniza ao voltar |
| T-LAT | Latência | 10 comandos "alimentar agora", cronometrar até o servo mover | Mediana < 3 s |
| T-BAT | Medição de bateria | Comparar com multímetro em 5 tensões (fonte ajustável 6–10 V ou pilhas em diferentes cargas) | Erro ≤ 0,1 V |
| T-NOB | No-break | Tirar a fonte da tomada durante uma refeição e depois recolocar | Sem reset; app recebe `ON_BATTERY` e `MAINS_RESTORED` |
| T-AUT | Autonomia | Pilhas novas, 3 refeições/dia, registrar % até 5 % | Registrar horas; comparar com estimativa de 02-hardware §5 |
| T-RST | Reset no meio da dosagem | Desligar e religar durante a liberação | Comporta fecha no boot; nada é servido em dobro |
| T-PET | Interferência | Mexer na vasilha durante a dosagem | Registro com `interference=true`, sem travar |

## 3. Métricas para a apresentação

- **Precisão**: erro médio absoluto (g e %) e desvio-padrão da dose, por tamanho de porção (T-DOS).
  Comparar com a referência (dose por tempo, sem balança): rodar T-DOS também em modo "tempo fixo" para
  mostrar o ganho de usar a balança.
- **Confiabilidade**: % de refeições `OK` em N refeições agendadas.
- **Escoamento/travamento**: `NO_FLOW` e tentativas de destravar por tamanho de grão (T-JAM).
- **Custo**: total gasto × teto de R$ 490 (`docs/orcamento.md`).
- **Energia**: autonomia medida (h) e consumo médio (mA).
- **Responsividade**: latência mediana app → servo.
