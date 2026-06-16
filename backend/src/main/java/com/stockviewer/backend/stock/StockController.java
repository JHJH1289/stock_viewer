package com.stockviewer.backend.stock;

import java.time.Instant;
import java.time.Duration;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.stockviewer.backend.kis.KisQuoteService;

@RestController
@RequestMapping("/api")
public class StockController {
    private static final Duration WATCHLIST_CACHE_TTL = Duration.ofSeconds(20);

    private final KisQuoteService kisQuoteService;
    private List<StockSnapshot> cachedWatchlist = List.of();
    private Instant cachedWatchlistAt = Instant.EPOCH;

    public StockController(KisQuoteService kisQuoteService) {
        this.kisQuoteService = kisQuoteService;
    }

    @GetMapping("/health")
    public ApiHealth health() {
        return new ApiHealth("UP", Instant.now());
    }

    @GetMapping("/stocks/watchlist")
    public synchronized List<StockSnapshot> watchlist() {
        if (!cachedWatchlist.isEmpty() && Instant.now().isBefore(cachedWatchlistAt.plus(WATCHLIST_CACHE_TTL))) {
            return cachedWatchlist;
        }

        StockSnapshot samsung = kisQuoteService.getDomesticQuote("005930", "\uC0BC\uC131\uC804\uC790");
        pauseBetweenQuoteCalls();
        StockSnapshot skHynix = kisQuoteService.getDomesticQuote("000660", "SK\uD558\uC774\uB2C9\uC2A4");
        pauseBetweenQuoteCalls();
        StockSnapshot apple = kisQuoteService.getOverseasQuote("AAPL", "Apple", "NAS", "NASDAQ");
        pauseBetweenQuoteCalls();
        StockSnapshot microsoft = kisQuoteService.getOverseasQuote("MSFT", "Microsoft", "NAS", "NASDAQ");
        pauseBetweenQuoteCalls();
        StockSnapshot nvidia = kisQuoteService.getOverseasQuote("NVDA", "NVIDIA", "NAS", "NASDAQ");
        pauseBetweenQuoteCalls();
        StockSnapshot alphabet = kisQuoteService.getOverseasQuote("GOOGL", "Alphabet", "NAS", "NASDAQ");
        pauseBetweenQuoteCalls();
        StockSnapshot spaceX = kisQuoteService.getOverseasQuote("SPCX", "SpaceX", "NAS", "NASDAQ");
        pauseBetweenQuoteCalls();
        StockSnapshot sAndP500 = kisQuoteService.getOverseasQuote("SPY", "S&P 500 ETF", "AMS", "NYSE ARCA");

        cachedWatchlist = List.of(samsung, skHynix, apple, microsoft, nvidia, alphabet, spaceX, sAndP500);
        cachedWatchlistAt = Instant.now();
        return cachedWatchlist;
    }

    public record ApiHealth(String status, Instant checkedAt) {
    }

    private void pauseBetweenQuoteCalls() {
        try {
            Thread.sleep(300);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
