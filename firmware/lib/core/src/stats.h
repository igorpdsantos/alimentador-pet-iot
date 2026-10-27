// Estatística simples para leituras da balança e do ADC.
#pragma once
#include <stddef.h>

double mean(const double* v, size_t n);
double stddev(const double* v, size_t n);
double median(const double* v, size_t n);
// Média descartando o menor e o maior valor (n ≥ 3); com n < 3, média simples.
double trimmedMean(const double* v, size_t n);
double round1(double x);
double round2(double x);
