package com.stockviewer.backend.Board;

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
@Table(name = "STOCKS")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "STOCK_ID")
    private Long stockId;

    @Column(name = "MARKET_CODE", nullable = false, length = 10)
    private String marketCode;

    @Column(nullable = false, length = 20)
    private String symbol;

    @Column(name = "STOCK_NAME", nullable = false, length = 100)
    private String stockName;

    @Column(name = "CORP_CODE", length = 20)
    private String corpCode;

    @Column(length = 100)
    private String sector;

    @Column(nullable = false)
    @Builder.Default
    private Integer listed = 1;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;
}
