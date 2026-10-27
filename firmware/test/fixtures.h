// Lê os exemplos do contrato em tools/protocol-fixtures (os mesmos usados pelo app).
#pragma once
#include <fstream>
#include <sstream>
#include <string>

inline std::string fixture(const std::string& name) {
  for (const char* base : {"../tools/protocol-fixtures/", "../../tools/protocol-fixtures/"}) {
    std::ifstream f(std::string(base) + name);
    if (f) {
      std::stringstream ss;
      ss << f.rdbuf();
      return ss.str();
    }
  }
  return "";
}
