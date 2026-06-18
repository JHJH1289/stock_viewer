package com.stockviewer.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "MARKETS")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Market {

    @Id
    @Column(name = "MARKET_CODE", length = 10)
    private String marketCode;

    @Column(name = "MARKET_NAME", nullable = false, length = 50)
    private String marketName;

    @Column(nullable = false, length = 3)
    private String country;

    @Column(nullable = false, length = 3)
    private String currency;
}
