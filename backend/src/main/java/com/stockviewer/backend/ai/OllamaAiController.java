package com.stockviewer.backend.ai;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ai")
public class OllamaAiController {

    private final String baseUrl;
    private final String model;
    private final RestClient restClient;

    public OllamaAiController(
            @Value("${ollama.base-url:http://localhost:11434}") String baseUrl,
            @Value("${ollama.model:llama3.1}") String model,
            RestClient.Builder restClientBuilder) {
        this.baseUrl = stripTrailingSlash(baseUrl);
        this.model = model;
        this.restClient = restClientBuilder.build();
    }

    @PostMapping("/stock-summary")
    public AiSummaryResponse stockSummary(@RequestBody StockSummaryRequest request) {
        String prompt = """
                You are a Korean stock research assistant. Write in Korean.
                Summarize this company for a retail investor using only the provided data.
                Include: 1) business/price snapshot, 2) news tone, 3) valuation metrics, 4) chart movement, 5) risks.
                Keep it concise, practical, and avoid pretending certainty.
                IMPORTANT: Do NOT write any disclaimer, caution, warning, or investment advice note. End your response after the analysis content.

                Stock:
                %s

                Valuation:
                %s

                Chart:
                %s

                Recent news:
                %s
                """.formatted(
                trimText(String.valueOf(request.quote()), 1200),
                trimText(String.valueOf(request.valuation()), 1200),
                trimText(String.valueOf(request.chart()), 1000),
                trimText(String.valueOf(request.news()), 1800));

        return generate(prompt);
    }

    @PostMapping("/portfolio-summary")
    public AiSummaryResponse portfolioSummary(@RequestBody PortfolioSummaryRequest request) {
        String prompt = """
                You are a Korean portfolio assistant. Write in Korean.
                Analyze only with the provided balances and holdings. Do not invent missing data.
                Do not calculate exact totals, returns, ratios, beta, or Sharpe. Numeric calculation is handled by the app.
                Use currentValue/pnl/pnlPercent only as rough context, not as values to recompute.
                Describe which markets and holdings the user is mainly invested in, separating Korean and US holdings.
                Judge concentration by money weight/currentValue, not by the number of stocks, but do not output exact percentages.
                Mention if one or two holdings appear to dominate the portfolio.
                Review diversification by country and available sector/name hints. If sector data is missing, say it is missing.
                For volatility, beta, and Sharpe, say exact assessment needs benchmark and time-series return data.
                Output in this compact order:
                1) main markets and core holdings
                2) concentration tendency by invested money
                3) diversification and risk/volatility check
                4) practical watch points
                Keep it concise.
                IMPORTANT: Do NOT write any disclaimer, caution, warning, or investment advice note. End your response after the analysis content.

                Balance:
                %s

                Holdings:
                %s
                """.formatted(
                trimText(String.valueOf(request.balance()), 1000),
                trimText(String.valueOf(request.holdings()), 3200));

        return generate(prompt);
    }

    private AiSummaryResponse generate(String prompt) {
        if (isBlank(model) || isBlank(baseUrl)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Ollama 설정이 비어 있습니다.");
        }

        try {
            OllamaGenerateResponse response = restClient.post()
                    .uri(baseUrl + "/api/generate")
                    .body(new OllamaGenerateRequest(model, prompt, false, Map.of("temperature", 0.2)))
                    .retrieve()
                    .body(OllamaGenerateResponse.class);

            String summary = response == null ? "" : response.response();
            if (isBlank(summary)) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Ollama 응답이 비어 있습니다.");
            }

            return new AiSummaryResponse(summary.trim(), model, LocalDateTime.now().toString());
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Ollama 서버에 연결할 수 없습니다. 로컬에서 ollama serve와 모델 실행 상태를 확인하세요.",
                    ex);
        }
    }

    private static String stripTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("/+$", "");
    }

    private static String trimText(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record StockSummaryRequest(
            Map<String, Object> quote,
            Map<String, Object> valuation,
            Map<String, Object> chart,
            List<Map<String, Object>> news) {
    }

    public record PortfolioSummaryRequest(
            Map<String, Object> balance,
            List<Map<String, Object>> holdings) {
    }

    public record OllamaGenerateRequest(
            String model,
            String prompt,
            boolean stream,
            Map<String, Object> options) {
    }

    public record OllamaGenerateResponse(String response) {
    }

    public record AiSummaryResponse(String summary, String model, String generatedAt) {
    }
}
