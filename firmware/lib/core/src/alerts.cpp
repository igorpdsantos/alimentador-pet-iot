#include "alerts.h"

const char* alertCode(uint16_t bit) {
  switch (bit) {
    case ALERT_LOW_BATTERY: return "LOW_BATTERY";
    case ALERT_ON_BATTERY: return "ON_BATTERY";
    case ALERT_HOPPER_LOW: return "HOPPER_LOW";
    case ALERT_HOPPER_EMPTY: return "HOPPER_EMPTY";
    case ALERT_NO_TIME: return "NO_TIME";
    case ALERT_NOT_CALIBRATED: return "NOT_CALIBRATED";
    case ALERT_SCALE_ERROR: return "SCALE_ERROR";
    case ALERT_OVERLOAD: return "OVERLOAD";
    case ALERT_NO_FLOW: return "NO_FLOW";
  }
  return "";
}

const char* alertMessage(uint16_t bit) {
  switch (bit) {
    case ALERT_LOW_BATTERY: return "Troque as pilhas";
    case ALERT_ON_BATTERY: return "Sem energia na tomada — usando pilhas";
    case ALERT_HOPPER_LOW: return "Ração acabando no reservatório";
    case ALERT_HOPPER_EMPTY: return "Reabasteça o alimentador";
    case ALERT_NO_TIME: return "Hora não sincronizada — verifique a internet";
    case ALERT_NOT_CALIBRATED: return "Balança sem calibração";
    case ALERT_SCALE_ERROR: return "Verifique a balança";
    case ALERT_OVERLOAD: return "Algo pesado na plataforma";
    case ALERT_NO_FLOW: return "Reservatório vazio ou travado — confira a ração";
  }
  return "";
}
