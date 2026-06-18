package com.stockviewer.backend.kis;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.stockviewer.backend.stock.StockHistoryPoint;
import com.stockviewer.backend.stock.StockSnapshot;

@Service
public class KisQuoteService {
    private static final String DOMESTIC_STOCK_TR_ID = "FHKST01010100";
    private static final String DOMESTIC_DAILY_CHART_TR_ID = "FHKST03010100";
    private static final String DOMESTIC_TIME_CHART_TR_ID = "FHKST03010200";
    private static final String OVERSEAS_STOCK_TR_ID = "HHDFS00000300";
    private static final DateTimeFormatter KIS_DATE_FORMATTER = DateTimeFormatter.BASIC_ISO_DATE;
    private static final DateTimeFormatter KIS_TIME_FORMATTER = DateTimeFormatter.ofPattern("HHmmss");

    private final KisProperties properties;
    private final KisAccessTokenService accessTokenService;
    private final RestClient restClient;

    public KisQuoteService(
            KisProperties properties,
            KisAccessTokenService accessTokenService,
            RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.accessTokenService = accessTokenService;
        this.restClient = restClientBuilder.build();
    }

    public StockSnapshot getDomesticQuote(String symbol, String fallbackName) {
        if (!properties.configured()) {
            throw new IllegalStateException("KIS API properties are not configured.");
        }

        JsonNode response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .scheme(scheme())
                        .host(host())
                        .port(port())
                        .path("/uapi/domestic-stock/v1/quotations/inquire-price")
                        .queryParam("FID_COND_MRKT_DIV_CODE", "J")
                        .queryParam("FID_INPUT_ISCD", symbol)
                        .build())
                .header("authorization", "Bearer " + accessTokenService.getAccessToken())
                .header("content-type", "application/json")
                .header("appKey", properties.appKey())
                .header("appSecret", properties.appSecret())
                .header("tr_id", DOMESTIC_STOCK_TR_ID)
                .header("custtype", "P")
                .retrieve()
                .body(JsonNode.class);

        validateKisResponse(response);

        JsonNode output = response == null ? null : response.path("output");
        if (output == null || output.isMissingNode()) {
            throw new IllegalStateException("KIS domestic quote output was not returned.");
        }

        double price = parseDouble(output.path("stck_prpr").asText());
        double changePercent = parseDouble(output.path("prdy_ctrt").asText());

        return new StockSnapshot(symbol, fallbackName, price, changePercent, "KRX", "KRW");
    }

    public List<StockHistoryPoint> getDomesticDailyHistory(String symbol, LocalDate startDate, LocalDate endDate) {
        if (!properties.configured()) {
            throw new IllegalStateException("KIS API properties are not configured.");
        }

        Map<String, StockHistoryPoint> pointsByTimestamp = new LinkedHashMap<>();
        LocalDate pageEndDate = endDate;

        while (!pageEndDate.isBefore(startDate) && pointsByTimestamp.size() < 380) {
            List<StockHistoryPoint> page = fetchDomesticDailyHistoryPage(symbol, startDate, pageEndDate);
            if (page.isEmpty()) {
                break;
            }

            for (StockHistoryPoint point : page) {
                pointsByTimestamp.putIfAbsent(point.timestamp(), point);
            }

            String oldestTimestamp = page.stream()
                    .map(StockHistoryPoint::timestamp)
                    .min(String::compareTo)
                    .orElse("");
            if (oldestTimestamp.isBlank()) {
                break;
            }

            LocalDate oldestDate = LocalDate.parse(oldestTimestamp);
            if (!oldestDate.isAfter(startDate)) {
                break;
            }

            pageEndDate = oldestDate.minusDays(1);
            pauseBriefly();
        }

        return pointsByTimestamp.values().stream()
                .filter(point -> !LocalDate.parse(point.timestamp()).isBefore(startDate))
                .sorted(Comparator.comparing(StockHistoryPoint::timestamp))
                .toList();
    }

    private List<StockHistoryPoint> fetchDomesticDailyHistoryPage(String symbol, LocalDate startDate, LocalDate endDate) {
        JsonNode response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .scheme(scheme())
                        .host(host())
                        .port(port())
                        .path("/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice")
                        .queryParam("FID_COND_MRKT_DIV_CODE", "J")
                        .queryParam("FID_INPUT_ISCD", symbol)
                        .queryParam("FID_INPUT_DATE_1", startDate.format(KIS_DATE_FORMATTER))
                        .queryParam("FID_INPUT_DATE_2", endDate.format(KIS_DATE_FORMATTER))
                        .queryParam("FID_PERIOD_DIV_CODE", "D")
                        .queryParam("FID_ORG_ADJ_PRC", "0")
                        .build())
                .header("authorization", "Bearer " + accessTokenService.getAccessToken())
                .header("content-type", "application/json")
                .header("appKey", properties.appKey())
                .header("appSecret", properties.appSecret())
                .header("tr_id", DOMESTIC_DAILY_CHART_TR_ID)
                .header("custtype", "P")
                .retrieve()
                .body(JsonNode.class);

        validateKisResponse(response);

        JsonNode output = response == null ? null : response.path("output2");
        if (output == null || !output.isArray()) {
            throw new IllegalStateException("KIS domestic daily chart output was not returned.");
        }

        return stream(output)
                .map(this::toDailyHistoryPoint)
                .sorted(Comparator.comparing(StockHistoryPoint::timestamp))
                .toList();
    }

    public List<StockHistoryPoint> getDomesticTodayMinuteHistory(String symbol) {
        if (!properties.configured()) {
            throw new IllegalStateException("KIS API properties are not configured.");
        }

        Map<String, StockHistoryPoint> pointsByTimestamp = new LinkedHashMap<>();
        LocalTime queryTime = LocalTime.of(15, 30);

        while (!queryTime.isBefore(LocalTime.of(9, 0)) && pointsByTimestamp.size() < 420) {
            JsonNode response = fetchDomesticMinuteChart(symbol, queryTime);
            validateKisResponse(response);

            JsonNode output = response == null ? null : response.path("output2");
            if (output == null || !output.isArray() || output.isEmpty()) {
                break;
            }

            LocalTime earliestTime = null;
            for (JsonNode item : output) {
                StockHistoryPoint point = toMinuteHistoryPoint(item);
                pointsByTimestamp.putIfAbsent(point.timestamp(), point);
                LocalTime itemTime = parseKisTime(item.path("stck_cntg_hour").asText(""));
                if (itemTime != null && (earliestTime == null || itemTime.isBefore(earliestTime))) {
                    earliestTime = itemTime;
                }
            }

            if (earliestTime == null || !earliestTime.isBefore(queryTime)) {
                break;
            }

            queryTime = earliestTime.minusSeconds(1);
            pauseBriefly();
        }

        return pointsByTimestamp.values().stream()
                .sorted(Comparator.comparing(StockHistoryPoint::timestamp))
                .toList();
    }

    public StockSnapshot getOverseasQuote(String symbol, String fallbackName, String exchangeCode, String market) {
        if (!properties.configured()) {
            throw new IllegalStateException("KIS API properties are not configured.");
        }

        JsonNode response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .scheme(scheme())
                        .host(host())
                        .port(port())
                        .path("/uapi/overseas-price/v1/quotations/price")
                        .queryParam("AUTH", "")
                        .queryParam("EXCD", exchangeCode)
                        .queryParam("SYMB", symbol)
                        .build())
                .header("authorization", "Bearer " + accessTokenService.getAccessToken())
                .header("content-type", "application/json")
                .header("appKey", properties.appKey())
                .header("appSecret", properties.appSecret())
                .header("tr_id", OVERSEAS_STOCK_TR_ID)
                .header("custtype", "P")
                .retrieve()
                .body(JsonNode.class);

        validateKisResponse(response);

        JsonNode output = response == null ? null : response.path("output");
        if (output == null || output.isMissingNode()) {
            throw new IllegalStateException("KIS overseas quote output was not returned.");
        }

        double price = firstNumber(output, "last", "t_xprc", "ovrs_nmix_prpr", "base");
        double changePercent = firstNumber(output, "rate", "prdy_ctrt");

        return new StockSnapshot(symbol, fallbackName, price, changePercent, market, "USD");
    }

    private void validateKisResponse(JsonNode response) {
        if (response == null) {
            throw new IllegalStateException("KIS response was empty.");
        }

        String resultCode = response.path("rt_cd").asText("");
        if (!resultCode.isBlank() && !"0".equals(resultCode)) {
            String messageCode = response.path("msg_cd").asText("UNKNOWN");
            String message = response.path("msg1").asText("KIS request failed.");
            throw new IllegalStateException("KIS quote request failed: " + messageCode + " " + message);
        }
    }

    private JsonNode fetchDomesticMinuteChart(String symbol, LocalTime queryTime) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .scheme(scheme())
                        .host(host())
                        .port(port())
                        .path("/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice")
                        .queryParam("FID_ETC_CLS_CODE", "")
                        .queryParam("FID_COND_MRKT_DIV_CODE", "J")
                        .queryParam("FID_INPUT_ISCD", symbol)
                        .queryParam("FID_INPUT_HOUR_1", queryTime.format(KIS_TIME_FORMATTER))
                        .queryParam("FID_PW_DATA_INCU_YN", "N")
                        .build())
                .header("authorization", "Bearer " + accessTokenService.getAccessToken())
                .header("content-type", "application/json")
                .header("appKey", properties.appKey())
                .header("appSecret", properties.appSecret())
                .header("tr_id", DOMESTIC_TIME_CHART_TR_ID)
                .header("custtype", "P")
                .retrieve()
                .body(JsonNode.class);
    }

    private java.util.stream.Stream<JsonNode> stream(JsonNode node) {
        if (node == null || !node.isArray()) {
            return java.util.stream.Stream.empty();
        }

        return StreamSupport.stream(node.spliterator(), false);
    }

    private StockHistoryPoint toDailyHistoryPoint(JsonNode item) {
        String date = item.path("stck_bsop_date").asText();

        return new StockHistoryPoint(
                toIsoDate(date),
                firstNumber(item, "stck_oprc"),
                firstNumber(item, "stck_hgpr"),
                firstNumber(item, "stck_lwpr"),
                firstNumber(item, "stck_clpr"),
                parseLong(item.path("acml_vol").asText()));
    }

    private StockHistoryPoint toMinuteHistoryPoint(JsonNode item) {
        String time = item.path("stck_cntg_hour").asText();
        String timestamp = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE) + "T" + toIsoTime(time);
        double price = firstNumber(item, "stck_prpr");

        return new StockHistoryPoint(
                timestamp,
                firstNumberOrDefault(item, price, "stck_oprc"),
                firstNumberOrDefault(item, price, "stck_hgpr"),
                firstNumberOrDefault(item, price, "stck_lwpr"),
                price,
                parseLong(item.path("cntg_vol").asText()));
    }

    private String toIsoDate(String value) {
        if (value == null || value.length() != 8) {
            return value == null ? "" : value;
        }

        return value.substring(0, 4) + "-" + value.substring(4, 6) + "-" + value.substring(6, 8);
    }

    private String toIsoTime(String value) {
        if (value == null || value.length() < 6) {
            return "00:00:00";
        }

        return value.substring(0, 2) + ":" + value.substring(2, 4) + ":" + value.substring(4, 6);
    }

    private LocalTime parseKisTime(String value) {
        if (value == null || value.length() < 6) {
            return null;
        }

        return LocalTime.parse(value.substring(0, 6), KIS_TIME_FORMATTER);
    }

    private String scheme() {
        return properties.baseUrl().startsWith("https") ? "https" : "http";
    }

    private String host() {
        String withoutScheme = properties.baseUrl().replaceFirst("^https?://", "");
        return withoutScheme.split(":")[0].split("/")[0];
    }

    private int port() {
        String withoutScheme = properties.baseUrl().replaceFirst("^https?://", "");
        String[] hostParts = withoutScheme.split("/")[0].split(":");
        if (hostParts.length < 2) {
            return -1;
        }
        return Integer.parseInt(hostParts[1]);
    }

    private double parseDouble(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }

        return Double.parseDouble(value.replace(",", ""));
    }

    private long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }

        return Long.parseLong(value.replace(",", ""));
    }

    private double firstNumber(JsonNode output, String... fieldNames) {
        for (String fieldName : fieldNames) {
            String value = output.path(fieldName).asText("");
            if (!value.isBlank()) {
                return parseDouble(value);
            }
        }

        return 0;
    }

    private double firstNumberOrDefault(JsonNode output, double fallback, String... fieldNames) {
        for (String fieldName : fieldNames) {
            String value = output.path(fieldName).asText("");
            if (!value.isBlank()) {
                return parseDouble(value);
            }
        }

        return fallback;
    }

    private void pauseBriefly() {
        try {
            Thread.sleep(120);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
