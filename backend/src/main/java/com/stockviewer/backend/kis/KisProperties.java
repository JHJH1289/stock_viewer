package com.stockviewer.backend.kis;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class KisProperties {
    private final String baseUrl;
    private final String appKey;
    private final String appSecret;

    public KisProperties(
            @Value("${kis.base-url}") String baseUrl,
            @Value("${kis.app-key}") String appKey,
            @Value("${kis.app-secret}") String appSecret) {
        this.baseUrl = baseUrl;
        this.appKey = appKey;
        this.appSecret = appSecret;
    }

    public String baseUrl() {
        return baseUrl;
    }

    public String appKey() {
        return appKey;
    }

    public String appSecret() {
        return appSecret;
    }

    public boolean configured() {
        return hasText(baseUrl) && hasText(appKey) && hasText(appSecret);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
