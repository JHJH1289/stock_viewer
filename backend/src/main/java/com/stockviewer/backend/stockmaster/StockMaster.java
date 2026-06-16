package com.stockviewer.backend.stockmaster;

public record StockMaster(
        String symbol,
        String name,
        String country,
        String exchange,
        String market,
        String currency,
        String corpCode,
        String source) {
}
