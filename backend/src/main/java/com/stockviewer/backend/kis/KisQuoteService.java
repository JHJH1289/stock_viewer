package com.stockviewer.backend.kis;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.stockviewer.backend.stock.StockSnapshot;

@Service
public class KisQuoteService {
    private static final String DOMESTIC_STOCK_TR_ID = "FHKST01010100";
    private static final String OVERSEAS_STOCK_TR_ID = "HHDFS00000300";

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

        String name = output.path("hts_kor_isnm").asText(fallbackName);
        double price = parseDouble(output.path("stck_prpr").asText());
        double changePercent = parseDouble(output.path("prdy_ctrt").asText());

        return new StockSnapshot(symbol, name.isBlank() ? fallbackName : name, price, changePercent, "KRX", "KRW");
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

    private double firstNumber(JsonNode output, String... fieldNames) {
        for (String fieldName : fieldNames) {
            String value = output.path(fieldName).asText("");
            if (!value.isBlank()) {
                return parseDouble(value);
            }
        }

        return 0;
    }
}
