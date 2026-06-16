package com.stockviewer.backend.kis;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;

@Service
public class KisAccessTokenService {
    private static final long TOKEN_EXPIRY_BUFFER_SECONDS = 60;

    private final KisProperties properties;
    private final RestClient restClient;
    private String accessToken;
    private Instant expiresAt = Instant.EPOCH;

    public KisAccessTokenService(KisProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    public synchronized String getAccessToken() {
        if (accessToken != null && Instant.now().isBefore(expiresAt.minusSeconds(TOKEN_EXPIRY_BUFFER_SECONDS))) {
            return accessToken;
        }

        JsonNode response = restClient.post()
                .uri(properties.baseUrl() + "/oauth2/tokenP")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "grant_type", "client_credentials",
                        "appkey", properties.appKey(),
                        "appsecret", properties.appSecret()))
                .retrieve()
                .body(JsonNode.class);

        if (response == null || !response.hasNonNull("access_token")) {
            throw new IllegalStateException("KIS access token was not returned.");
        }

        accessToken = response.get("access_token").asText();
        long expiresIn = response.path("expires_in").asLong(3600);
        expiresAt = Instant.now().plusSeconds(expiresIn);
        return accessToken;
    }
}
