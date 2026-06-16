package com.stockviewer.backend.config;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integrations")
public class IntegrationStatusController {
    private final String openDartApiKey;
    private final String kisBaseUrl;
    private final String kisAppKey;
    private final String kisAppSecret;

    public IntegrationStatusController(
            @Value("${opendart.api-key:}") String openDartApiKey,
            @Value("${kis.base-url:}") String kisBaseUrl,
            @Value("${kis.app-key:}") String kisAppKey,
            @Value("${kis.app-secret:}") String kisAppSecret) {
        this.openDartApiKey = openDartApiKey;
        this.kisBaseUrl = kisBaseUrl;
        this.kisAppKey = kisAppKey;
        this.kisAppSecret = kisAppSecret;
    }

    @GetMapping("/status")
    public IntegrationStatus status() {
        boolean openDartConfigured = hasText(openDartApiKey);
        boolean kisConfigured = hasText(kisBaseUrl) && hasText(kisAppKey) && hasText(kisAppSecret);

        return new IntegrationStatus(
                Instant.now(),
                List.of(
                        new IntegrationCheck("OpenDART", openDartConfigured),
                        new IntegrationCheck("Korea Investment", kisConfigured)));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public record IntegrationStatus(Instant checkedAt, List<IntegrationCheck> checks) {
    }

    public record IntegrationCheck(String name, boolean configured) {
    }
}
