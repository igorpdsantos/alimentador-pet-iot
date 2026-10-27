#include "stats.h"
#include <math.h>
#include <string.h>
#include <algorithm>

double mean(const double* v, size_t n) {
  if (n == 0) return 0;
  double s = 0;
  for (size_t i = 0; i < n; i++) s += v[i];
  return s / n;
}

double stddev(const double* v, size_t n) {
  if (n < 2) return 0;
  double m = mean(v, n), s = 0;
  for (size_t i = 0; i < n; i++) s += (v[i] - m) * (v[i] - m);
  return sqrt(s / (n - 1));
}

double median(const double* v, size_t n) {
  if (n == 0) return 0;
  double tmp[32];
  n = std::min(n, sizeof(tmp) / sizeof(tmp[0]));
  memcpy(tmp, v, n * sizeof(double));
  std::sort(tmp, tmp + n);
  return n % 2 ? tmp[n / 2] : (tmp[n / 2 - 1] + tmp[n / 2]) / 2;
}

double trimmedMean(const double* v, size_t n) {
  if (n < 3) return mean(v, n);
  double lo = v[0], hi = v[0], s = 0;
  for (size_t i = 0; i < n; i++) {
    s += v[i];
    lo = std::min(lo, v[i]);
    hi = std::max(hi, v[i]);
  }
  return (s - lo - hi) / (n - 2);
}

double round1(double x) { return round(x * 10.0) / 10.0; }
double round2(double x) { return round(x * 100.0) / 100.0; }
