package com.stockviewer.backend.ranking;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.stockviewer.backend.entity.Holding;
import com.stockviewer.backend.entity.User;
import com.stockviewer.backend.kis.KisQuoteService;
import com.stockviewer.backend.repository.HoldingRepository;
import com.stockviewer.backend.repository.UserRepository;
import com.stockviewer.backend.stock.StockHistoryPoint;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/ranking")
@RequiredArgsConstructor
public class RankingController {

    private static final int TOP_N = 10;

    private final HoldingRepository holdingRepository;
    private final UserRepository userRepository;
    private final KisQuoteService kisQuoteService;

    // 날짜가 바뀌면 자동 초기화되는 가격 캐시
    private final Map<String, BigDecimal> priceCache = new ConcurrentHashMap<>();
    private volatile LocalDate cachedDate = LocalDate.EPOCH;

    @GetMapping
    @SuppressWarnings("null")
    public List<RankingResponse> getRanking() {
        LocalDate lastTradingDay = lastTradingDay();

        // 날짜가 바뀌면 어제 종가 캐시 초기화
        if (!lastTradingDay.equals(cachedDate)) {
            priceCache.clear();
            cachedDate = lastTradingDay;
        }

        List<Holding> allHoldings = holdingRepository.findAll();
        if (allHoldings.isEmpty()) return List.of();

        // 종목별 어제 종가 조회
        Map<String, BigDecimal> prices = new HashMap<>();
        for (Holding h : allHoldings) {
            if (prices.containsKey(h.getSymbol())) continue;
            BigDecimal close = yesterdayClose(h, lastTradingDay);
            if (close != null) prices.put(h.getSymbol(), close);
        }

        // 사용자별 평가금액(어제 종가 기준) / 매수원가 합산
        Map<Long, BigDecimal[]> statsMap = new HashMap<>();
        for (Holding h : allHoldings) {
            BigDecimal price = prices.get(h.getSymbol());
            if (price == null) continue;
            BigDecimal qty   = BigDecimal.valueOf(h.getQuantity());
            BigDecimal value = price.multiply(qty);
            BigDecimal cost  = h.getAvgBuyPrice().multiply(qty);
            statsMap.merge(h.getUserId(),
                new BigDecimal[]{value, cost},
                (a, b) -> new BigDecimal[]{a[0].add(b[0]), a[1].add(b[1])});
        }

        if (statsMap.isEmpty()) return List.of();

        // userId → username 매핑
        Map<Long, String> usernameMap = userRepository.findAllById(List.copyOf(statsMap.keySet()))
            .stream()
            .collect(Collectors.toMap(User::getId, User::getUsername));

        // 수익률 내림차순 TOP 10
        List<RankingResponse> result = new ArrayList<>();
        int rank = 1;
        for (var entry : statsMap.entrySet().stream()
                .filter(e -> e.getValue()[1].compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator.<Map.Entry<Long, BigDecimal[]>>comparingDouble(
                    e -> profitRate(e.getValue()[0], e.getValue()[1])).reversed())
                .limit(TOP_N)
                .toList()) {
            BigDecimal[] s = entry.getValue();
            result.add(new RankingResponse(
                rank++,
                usernameMap.getOrDefault(entry.getKey(), "Unknown"),
                profitRate(s[0], s[1]),
                s[0].doubleValue(),
                s[1].doubleValue()
            ));
        }
        return result;
    }

    // 가장 최근 거래일 (주말 건너뜀)
    private LocalDate lastTradingDay() {
        LocalDate day = LocalDate.now().minusDays(1);
        while (day.getDayOfWeek() == DayOfWeek.SATURDAY
            || day.getDayOfWeek() == DayOfWeek.SUNDAY) {
            day = day.minusDays(1);
        }
        return day;
    }

    // 어제 종가 조회 (캐시 → KIS API, 공휴일이면 최대 5거래일 전까지 재시도)
    private BigDecimal yesterdayClose(Holding h, LocalDate targetDate) {
        BigDecimal cached = priceCache.get(h.getSymbol());
        if (cached != null) return cached;

        LocalDate date = targetDate;
        for (int attempt = 0; attempt < 5; attempt++) {
            try {
                List<StockHistoryPoint> history = fetchHistory(h, date);
                if (!history.isEmpty()) {
                    BigDecimal price = BigDecimal.valueOf(
                        history.get(history.size() - 1).close());
                    priceCache.put(h.getSymbol(), price);
                    return price;
                }
            } catch (Exception ignored) { /* KIS 미설정 또는 API 오류 */ }

            // 하루 더 거슬러 올라감 (공휴일 대비)
            date = date.minusDays(1);
            while (date.getDayOfWeek() == DayOfWeek.SATURDAY
                || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                date = date.minusDays(1);
            }
        }
        return null;
    }

    private List<StockHistoryPoint> fetchHistory(Holding h, LocalDate date) {
        if ("KRX".equals(h.getMarketCode())) {
            return kisQuoteService.getDomesticDailyHistory(h.getSymbol(), date, date);
        }
        String exchangeCode = switch (h.getMarketCode().toUpperCase()) {
            case "NYSE"      -> "NYS";
            case "NYSE_ARCA" -> "AMS";
            case "CBOE_BZX"  -> "BAQ";
            default          -> "NAS";
        };
        return kisQuoteService.getOverseasDailyHistory(
            h.getSymbol(), exchangeCode, date, date);
    }

    private double profitRate(BigDecimal value, BigDecimal cost) {
        return value.subtract(cost)
            .divide(cost, 6, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100))
            .doubleValue();
    }
}
