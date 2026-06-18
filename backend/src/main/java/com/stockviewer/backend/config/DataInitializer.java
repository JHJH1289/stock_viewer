package com.stockviewer.backend.config;

import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.stockviewer.backend.entity.Market;
import com.stockviewer.backend.repository.MarketRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final MarketRepository marketRepository;

    @Override
    public void run(String... args) {
        List<Market> defaultMarkets = List.of(
            Market.builder().marketCode("KRX").marketName("Korea Exchange").country("KOR").currency("KRW").build(),
            Market.builder().marketCode("NASDAQ").marketName("NASDAQ").country("USA").currency("USD").build(),
            Market.builder().marketCode("NYSE").marketName("New York Stock Exchange").country("USA").currency("USD").build(),
            Market.builder().marketCode("NYSE_ARCA").marketName("NYSE Arca").country("USA").currency("USD").build(),
            Market.builder().marketCode("CBOE_BZX").marketName("Cboe BZX").country("USA").currency("USD").build()
        );

        defaultMarkets.stream()
                .filter(market -> !marketRepository.existsById(market.getMarketCode()))
                .forEach(marketRepository::save);
    }
}
