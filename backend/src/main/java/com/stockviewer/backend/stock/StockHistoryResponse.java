package com.stockviewer.backend.stock;

import java.util.List;

public record StockHistoryResponse(
        String symbol,
        String range,
        String interval,
        String currency,
        List<StockHistoryPoint> points) {
}
