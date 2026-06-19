package com.stockviewer.backend.valuation;

import java.util.Optional;
import java.util.List;

public interface ValuationMetricsRepository {
    Optional<ValuationMetrics> findBySymbol(String symbol);

    List<ValuationMetrics> findAllBySymbol(String symbol);
}
