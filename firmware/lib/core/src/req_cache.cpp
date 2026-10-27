#include "req_cache.h"

ReqCache::Lookup ReqCache::check(const char* reqId, std::string& response) {
  for (auto& e : entries_) {
    if (e.reqId.empty() || e.reqId != reqId) continue;
    if (!e.done) return Lookup::Pending;
    response = e.response;
    return Lookup::Done;
  }
  Entry& e = entries_[next_];
  next_ = (next_ + 1) % REQ_CACHE_SIZE;
  e.reqId = reqId;
  e.response.clear();
  e.done = false;
  return Lookup::New;
}

void ReqCache::complete(const char* reqId, const std::string& response) {
  for (auto& e : entries_) {
    if (e.reqId == reqId) {
      e.response = response;
      e.done = true;
      return;
    }
  }
}
