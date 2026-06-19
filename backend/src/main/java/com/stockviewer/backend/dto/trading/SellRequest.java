package com.stockviewer.backend.dto.trading;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SellRequest {
    @NotBlank
    private String symbol;
    @NotBlank
    private String marketCode;
    @Min(1)
    private long quantity;
    @DecimalMin("0.0001")
    private BigDecimal price;
}
