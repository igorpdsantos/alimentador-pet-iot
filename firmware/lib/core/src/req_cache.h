// Idempotência por req_id (RNF04): guarda os últimos 16 pedidos e suas respostas.
#pragma once
#include <string>

constexpr int REQ_CACHE_SIZE = 16;

class ReqCache {
 public:
  enum class Lookup { New, Pending, Done };
  // New: registra como pendente. Pending: já está sendo executado. Done: `response` recebe a resposta guardada.
  Lookup check(const char* reqId, std::string& response);
  void complete(const char* reqId, const std::string& response);

 private:
  struct Entry {
    std::string reqId;
    std::string response;
    bool done = false;
  };
  Entry entries_[REQ_CACHE_SIZE];
  int next_ = 0;
};
