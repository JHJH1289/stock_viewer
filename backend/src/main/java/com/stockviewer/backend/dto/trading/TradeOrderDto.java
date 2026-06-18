package com.stockviewer.backend.dto.trading;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.stockviewer.backend.entity.TradeOrder;

public record TradeOrderDto(
    Long orderId,
    String symbol,
    String stockName,
    String marketCode,
    String orderType,
    Long quantity,
    BigDecimal price,
    BigDecimal totalAmount,
    String currency,
    LocalDateTime createdAt
) {
    public static TradeOrderDto from(TradeOrder o) {
        return new TradeOrderDto(o.getOrderId(), o.getSymbol(), o.getStockName(),
                o.getMarketCode(), o.getOrderType(), o.getQuantity(),
                o.getPrice(), o.getTotalAmount(), o.getCurrency(), o.getCreatedAt());
    }
}
