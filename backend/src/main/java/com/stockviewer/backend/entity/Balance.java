package com.stockviewer.backend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "BALANCE")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Balance {

    @Id
    @Column(name = "USER_ID")
    private Long userId;

    @Column(name = "KRW_AMOUNT", nullable = false, precision = 20, scale = 2)
    private BigDecimal krwAmount;

    @Column(name = "USD_AMOUNT", nullable = false, precision = 20, scale = 4)
    private BigDecimal usdAmount;

    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;
}
