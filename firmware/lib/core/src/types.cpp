#include "types.h"
#include <string.h>

const char* toString(FeedMode m) { return m == FeedMode::FillTo ? "fill_to" : "add"; }

const char* toString(FeedSource s) {
  switch (s) {
    case FeedSource::Schedule: return "schedule";
    case FeedSource::Button: return "button";
    default: return "app";
  }
}

const char* toString(FeedStatus s) {
  switch (s) {
    case FeedStatus::Ok: return "OK";
    case FeedStatus::Partial: return "PARTIAL";
    case FeedStatus::NoFlow: return "NO_FLOW";
    case FeedStatus::BowlMissing: return "BOWL_MISSING";
    case FeedStatus::LowBattery: return "LOW_BATTERY";
    case FeedStatus::ScaleError: return "SCALE_ERROR";
    case FeedStatus::Canceled: return "CANCELED";
    case FeedStatus::SkippedFull: return "SKIPPED_FULL";
    case FeedStatus::Timeout: return "TIMEOUT";
  }
  return "SCALE_ERROR";
}

bool parseFeedMode(const char* s, FeedMode& out) {
  if (!s || strcmp(s, "add") == 0) { out = FeedMode::Add; return true; }
  if (strcmp(s, "fill_to") == 0) { out = FeedMode::FillTo; return true; }
  return false;
}
