package com.stockviewer.backend.stockmaster;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StockMasterController {
    private final StockMasterRepository stockMasterRepository;

    public StockMasterController(StockMasterRepository stockMasterRepository) {
        this.stockMasterRepository = stockMasterRepository;
    }

    @GetMapping("/api/stocks/search")
    public List<StockMasterDto> search(
            @RequestParam(value = "keyword", defaultValue = "") String keyword,
            @RequestParam(value = "limit", defaultValue = "20") int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));

        return stockMasterRepository.search(keyword, safeLimit)
                .stream()
                .map(StockMasterDto::from)
                .toList();
    }

    @GetMapping("/api/stocks/master/summary")
    public StockMasterSummary summary() {
        return new StockMasterSummary(stockMasterRepository.count());
    }

    public record StockMasterSummary(int count) {
    }
}
