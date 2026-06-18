package com.stockviewer.backend.stock;

import java.time.Instant;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.stockviewer.backend.kis.KisQuoteService;
import com.stockviewer.backend.stockmaster.StockMaster;
import com.stockviewer.backend.stockmaster.StockMasterRepository;

@RestController
@RequestMapping("/api")
public class StockController {
    private static final Duration WATCHLIST_CACHE_TTL = Duration.ofSeconds(20);
    private static final Duration QUOTE_CACHE_TTL = Duration.ofSeconds(20);
    private static final Duration HISTORY_CACHE_TTL = Duration.ofSeconds(60);
    private static final int MAX_QUOTE_REQUEST_SIZE = 10;

    private final KisQuoteService kisQuoteService;
    private final StockMasterRepository stockMasterRepository;
    private List<StockSnapshot> cachedWatchlist = List.of();
    private Instant cachedWatchlistAt = Instant.EPOCH;
    private final Map<String, CachedQuote> quoteCache = new ConcurrentHashMap<>();
    private final Map<String, CachedHistory> historyCache = new ConcurrentHashMap<>();

    public StockController(KisQuoteService kisQuoteService, StockMasterRepository stockMasterRepository) {
        this.kisQuoteService = kisQuoteService;
        this.stockMasterRepository = stockMasterRepository;
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

        if (!kisQuoteService.isConfigured()) {
            return List.of();
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

    @GetMapping("/stocks/quote/{symbol}")
    public StockSnapshot quote(@PathVariable("symbol") String symbol) {
        StockMaster stock = stockMasterRepository.findBySymbol(symbol)
                .orElseThrow(() -> new IllegalArgumentException("Unknown stock symbol: " + symbol));

        return getCachedQuote(new StockQuoteRequest(
                stock.symbol(),
                stock.name(),
                stock.country(),
                stock.exchange()))
                .stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Quote is not available for symbol: " + symbol));
    }

    @GetMapping("/stocks/history/{symbol}")
    public StockHistoryResponse history(
            @PathVariable("symbol") String symbol,
            @RequestParam(name = "range", defaultValue = "1mo") String range) {
        StockMaster stock = stockMasterRepository.findBySymbol(symbol)
                .orElseThrow(() -> new IllegalArgumentException("Unknown stock symbol: " + symbol));

        String normalizedRange = normalizeRange(range);
        String cacheKey = normalize(stock.symbol()) + ":" + normalizedRange;
        CachedHistory cachedHistory = historyCache.get(cacheKey);
        if (cachedHistory != null && Instant.now().isBefore(cachedHistory.cachedAt().plus(HISTORY_CACHE_TTL))) {
            return cachedHistory.history();
        }

        List<StockHistoryPoint> points = getHistoryPoints(stock, normalizedRange);

        StockHistoryResponse history = new StockHistoryResponse(
                stock.symbol(),
                normalizedRange,
                "KR".equals(normalize(stock.country())) && "1d".equals(normalizedRange) ? "30m" : "1d",
                stock.currency(),
                points);
        historyCache.put(cacheKey, new CachedHistory(history, Instant.now()));

        return history;
    }

    public record ApiHealth(String status, Instant checkedAt) {
    }

    public record StockQuoteRequest(String symbol, String name, String country, String exchange) {
    }

    private List<StockHistoryPoint> toThirtyMinutePoints(List<StockHistoryPoint> points) {
        if (points.size() <= 1) {
            return points;
        }

        List<StockHistoryPoint> sampledPoints = new ArrayList<>();
        for (int index = 0; index < points.size(); index += 30) {
            sampledPoints.add(points.get(index));
        }

        StockHistoryPoint lastPoint = points.get(points.size() - 1);
        if (!sampledPoints.get(sampledPoints.size() - 1).timestamp().equals(lastPoint.timestamp())) {
            sampledPoints.add(lastPoint);
        }

        return sampledPoints;
    }

    private String normalizeRange(String range) {
        return switch (normalize(range)) {
            case "1D", "DAY" -> "1d";
            case "1MO", "1M", "MONTH" -> "1mo";
            case "6MO", "6M" -> "6mo";
            case "1Y", "YEAR" -> "1y";
            default -> range == null ? "1mo" : range.trim().toLowerCase(Locale.ROOT);
        };
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

    private List<StockHistoryPoint> getHistoryPoints(StockMaster stock, String normalizedRange) {
        LocalDate now = LocalDate.now();
        String country = normalize(stock.country());

        if ("KR".equals(country)) {
            return switch (normalizedRange) {
                case "1d" -> toThirtyMinutePoints(kisQuoteService.getDomesticTodayMinuteHistory(stock.symbol()));
                case "1mo" -> kisQuoteService.getDomesticDailyHistory(stock.symbol(), now.minusMonths(1), now);
                case "6mo" -> kisQuoteService.getDomesticDailyHistory(stock.symbol(), now.minusMonths(6), now);
                case "1y" -> kisQuoteService.getDomesticDailyHistory(stock.symbol(), now.minusYears(1), now);
                default -> throw new IllegalArgumentException("Unsupported history range: " + normalizedRange);
            };
        }

        if ("US".equals(country)) {
            String exchangeCode = toKisExchangeCode(stock.exchange());
            return switch (normalizedRange) {
                case "1d" -> kisQuoteService.getOverseasDailyHistory(stock.symbol(), exchangeCode, now.minusDays(7), now);
                case "1mo" -> kisQuoteService.getOverseasDailyHistory(stock.symbol(), exchangeCode, now.minusMonths(1), now);
                case "6mo" -> kisQuoteService.getOverseasDailyHistory(stock.symbol(), exchangeCode, now.minusMonths(6), now);
                case "1y" -> kisQuoteService.getOverseasDailyHistory(stock.symbol(), exchangeCode, now.minusYears(1), now);
                default -> throw new IllegalArgumentException("Unsupported history range: " + normalizedRange);
            };
        }

        throw new IllegalArgumentException("Unsupported country: " + stock.country());
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
            case "NYSE_AMERICAN", "NYSE_ARCA", "CBOE_BZX", "BATS" -> "AMS";
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

    private record CachedHistory(StockHistoryResponse history, Instant cachedAt) {
    }

    private void pauseBetweenQuoteCalls() {
        try {
            Thread.sleep(300);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
