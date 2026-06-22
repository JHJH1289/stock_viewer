package com.stockviewer.backend.news;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

@RestController
@RequestMapping("/api/news")
public class NaverNewsController {

    private static final String NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json";

    private final String clientId;
    private final String clientSecret;
    private final RestClient restClient;

    public NaverNewsController(
            @Value("${naver.search.client-id:}") String clientId,
            @Value("${naver.search.client-secret:}") String clientSecret,
            RestClient.Builder restClientBuilder) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.restClient = restClientBuilder.build();
    }

    @GetMapping("/major")
    public List<NewsItem> majorNews(
            @RequestParam(name = "query", defaultValue = "주식 증권 코스피 나스닥") String query,
            @RequestParam(name = "display", defaultValue = "8") int display) {
        if (isBlank(clientId) || isBlank(clientSecret)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "네이버 검색 API 키가 설정되지 않았습니다.");
        }

        int safeDisplay = Math.max(1, Math.min(display, 10));
        NaverNewsResponse response = restClient.get()
                .uri(NAVER_NEWS_URL + "?query={query}&display={display}&sort=date", query, safeDisplay)
                .header("X-Naver-Client-Id", clientId)
                .header("X-Naver-Client-Secret", clientSecret)
                .retrieve()
                .body(NaverNewsResponse.class);

        if (response == null || response.items() == null) {
            return List.of();
        }

        return response.items().stream()
                .map(item -> new NewsItem(
                        clean(item.title()),
                        clean(item.description()),
                        firstText(item.originallink(), item.link()),
                        parsePubDate(item.pubDate())))
                .toList();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String firstText(String primary, String fallback) {
        return isBlank(primary) ? fallback : primary;
    }

    private String clean(String value) {
        if (value == null) {
            return "";
        }
        return HtmlUtils.htmlUnescape(value.replaceAll("<[^>]+>", "")).trim();
    }

    private String parsePubDate(String value) {
        if (isBlank(value)) {
            return "";
        }
        try {
            return ZonedDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME).toLocalDateTime().toString();
        } catch (RuntimeException ignored) {
            return value;
        }
    }

    public record NewsItem(String title, String description, String link, String publishedAt) {
    }

    public record NaverNewsResponse(List<NaverNewsDocument> items) {
    }

    public record NaverNewsDocument(String title, String originallink, String link, String description, String pubDate) {
    }
}
