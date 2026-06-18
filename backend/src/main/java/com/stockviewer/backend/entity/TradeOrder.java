package com.stockviewer.backend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "TRADE_ORDERS")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ORDER_ID")
    private Long orderId;

    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 20)
    private String symbol;

    @Column(name = "STOCK_NAME", nullable = false, length = 100)
    private String stockName;

    @Column(name = "MARKET_CODE", nullable = false, length = 10)
    private String marketCode;

    @Column(name = "ORDER_TYPE", nullable = false, length = 4)
    private String orderType;

    @Column(nullable = false)
    private Long quantity;

    @Column(nullable = false, precision = 20, scale = 4)
    private BigDecimal price;

    @Column(name = "TOTAL_AMOUNT", nullable = false, precision = 20, scale = 4)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;
}
