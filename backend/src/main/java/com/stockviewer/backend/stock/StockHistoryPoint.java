package com.stockviewer.backend.stock;

public record StockHistoryPoint(
        String timestamp,
        double open,
        double high,
        double low,
        double close,
        long volume) {
}
