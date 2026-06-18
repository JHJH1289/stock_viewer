package com.stockviewer.backend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "HOLDINGS", uniqueConstraints = @UniqueConstraint(columnNames = {"USER_ID", "SYMBOL"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Holding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "HOLDING_ID")
    private Long holdingId;

    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 20)
    private String symbol;

    @Column(name = "STOCK_NAME", nullable = false, length = 100)
    private String stockName;

    @Column(name = "MARKET_CODE", nullable = false, length = 10)
    private String marketCode;

    @Column(nullable = false)
    private Long quantity;

    @Column(name = "AVG_BUY_PRICE", nullable = false, precision = 20, scale = 4)
    private BigDecimal avgBuyPrice;

    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;
}
