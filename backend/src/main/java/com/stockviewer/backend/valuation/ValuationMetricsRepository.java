package com.stockviewer.backend.valuation;

import java.util.Optional;

public interface ValuationMetricsRepository {
    Optional<ValuationMetrics> findBySymbol(String symbol);
}
