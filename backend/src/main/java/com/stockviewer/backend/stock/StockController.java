package com.stockviewer.backend.stock;

import java.time.Instant;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class StockController {
    @GetMapping("/health")
    public ApiHealth health() {
        return new ApiHealth("UP", Instant.now());
    }

    @GetMapping("/stocks/watchlist")
    public List<StockSnapshot> watchlist() {
        return List.of(
                new StockSnapshot("AAPL", "Apple", 198.42, 1.24, "NASDAQ"),
                new StockSnapshot("MSFT", "Microsoft", 471.16, -0.38, "NASDAQ"),
                new StockSnapshot("NVDA", "NVIDIA", 141.97, 2.81, "NASDAQ"),
                new StockSnapshot("TSLA", "Tesla", 181.23, -1.17, "NASDAQ"));
    }

    public record ApiHealth(String status, Instant checkedAt) {
    }

    public record StockSnapshot(String symbol, String name, double price, double changePercent, String market) {
    }
}
