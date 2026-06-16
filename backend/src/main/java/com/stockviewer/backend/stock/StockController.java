package com.stockviewer.backend.stock;

import java.time.Instant;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.stockviewer.backend.kis.KisQuoteService;

@RestController
@RequestMapping("/api")
public class StockController {
    private static final Duration WATCHLIST_CACHE_TTL = Duration.ofSeconds(20);
    private static final Duration QUOTE_CACHE_TTL = Duration.ofSeconds(20);
    private static final int MAX_QUOTE_REQUEST_SIZE = 10;

    private final KisQuoteService kisQuoteService;
    private List<StockSnapshot> cachedWatchlist = List.of();
    private Instant cachedWatchlistAt = Instant.EPOCH;
    private final Map<String, CachedQuote> quoteCache = new ConcurrentHashMap<>();

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

    @PostMapping("/stocks/quotes")
    public List<StockSnapshot> quotes(@RequestBody List<StockQuoteRequest> requests) {
        return requests.stream()
                .limit(MAX_QUOTE_REQUEST_SIZE)
                .map(this::getCachedQuote)
                .flatMap(List::stream)
                .toList();
    }

    public record ApiHealth(String status, Instant checkedAt) {
    }

    public record StockQuoteRequest(String symbol, String name, String country, String exchange) {
    }

    private List<StockSnapshot> getCachedQuote(StockQuoteRequest request) {
        String key = quoteKey(request);
        CachedQuote cachedQuote = quoteCache.get(key);
        if (cachedQuote != null && Instant.now().isBefore(cachedQuote.cachedAt().plus(QUOTE_CACHE_TTL))) {
            return List.of(cachedQuote.quote());
        }

        try {
            StockSnapshot quote = getQuote(request);
            quoteCache.put(key, new CachedQuote(quote, Instant.now()));
            pauseBetweenQuoteCalls();
            return List.of(quote);
        } catch (RuntimeException exception) {
            return List.of();
        }
    }

    private StockSnapshot getQuote(StockQuoteRequest request) {
        String country = normalize(request.country());
        String symbol = request.symbol();
        String name = request.name() == null || request.name().isBlank() ? symbol : request.name();

        if ("KR".equals(country)) {
            return kisQuoteService.getDomesticQuote(symbol, name);
        }

        if ("US".equals(country)) {
            String exchangeCode = toKisExchangeCode(request.exchange());
            return kisQuoteService.getOverseasQuote(symbol, name, exchangeCode, normalizeMarket(request.exchange()));
        }

        throw new IllegalArgumentException("Unsupported country: " + request.country());
    }

    private String toKisExchangeCode(String exchange) {
        return switch (normalize(exchange)) {
            case "NASDAQ" -> "NAS";
            case "NYSE" -> "NYS";
            case "NYSE_AMERICAN", "NYSE_ARCA" -> "AMS";
            default -> throw new IllegalArgumentException("Unsupported US exchange: " + exchange);
        };
    }

    private String normalizeMarket(String exchange) {
        return switch (normalize(exchange)) {
            case "NASDAQ" -> "NASDAQ";
            case "NYSE" -> "NYSE";
            case "NYSE_AMERICAN" -> "NYSE AMERICAN";
            case "NYSE_ARCA" -> "NYSE ARCA";
            default -> normalize(exchange);
        };
    }

    private String quoteKey(StockQuoteRequest request) {
        return normalize(request.country()) + ":" + normalize(request.exchange()) + ":" + normalize(request.symbol());
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private record CachedQuote(StockSnapshot quote, Instant cachedAt) {
    }

    private void pauseBetweenQuoteCalls() {
        try {
            Thread.sleep(300);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
