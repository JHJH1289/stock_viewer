package com.stockviewer.backend.stock;

public record StockSnapshot(
        String symbol,
        String name,
        double price,
        double changePercent,
        String market,
        String currency) {
}
