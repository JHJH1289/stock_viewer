package com.stockviewer.backend.dto.trading;

import java.math.BigDecimal;

public record BalanceResponse(BigDecimal krwAmount, BigDecimal usdAmount) {
}
