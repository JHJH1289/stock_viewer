package com.stockviewer.backend.dto.trading;

import java.math.BigDecimal;

import com.stockviewer.backend.entity.Holding;

public record HoldingDto(
    Long holdingId,
    String symbol,
    String stockName,
    String marketCode,
    Long quantity,
    BigDecimal avgBuyPrice
) {
    public static HoldingDto from(Holding h) {
        return new HoldingDto(h.getHoldingId(), h.getSymbol(), h.getStockName(),
                h.getMarketCode(), h.getQuantity(), h.getAvgBuyPrice());
    }
}
