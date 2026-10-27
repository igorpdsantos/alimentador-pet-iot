// Task de monitoramento: energia, bateria, alertas e publicação do status (specs/04-firmware.md §3, §5).
#pragma once

namespace monitor {
void task(void*);
void publishConfig();
// Para o LED: há erro que pede atenção?
bool hasError();
}  // namespace monitor
