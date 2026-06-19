package com.stockviewer.backend.Board;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StockRepository extends JpaRepository<Stock, Long> {
    Optional<Stock> findByMarketCodeAndSymbol(String marketCode, String symbol);
}
