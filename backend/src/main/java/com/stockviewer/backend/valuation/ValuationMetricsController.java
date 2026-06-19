package com.stockviewer.backend.valuation;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stocks/valuation")
public class ValuationMetricsController {
    private final ValuationMetricsRepository valuationMetricsRepository;

    public ValuationMetricsController(ValuationMetricsRepository valuationMetricsRepository) {
        this.valuationMetricsRepository = valuationMetricsRepository;
    }

    @GetMapping("/{symbol}")
    public ResponseEntity<ValuationMetrics> findBySymbol(@PathVariable("symbol") String symbol) {
        return valuationMetricsRepository.findBySymbol(symbol)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{symbol}/history")
    public ResponseEntity<List<ValuationMetrics>> findAllBySymbol(@PathVariable("symbol") String symbol) {
        List<ValuationMetrics> metrics = valuationMetricsRepository.findAllBySymbol(symbol);
        if (metrics.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(metrics);
    }
}
