package com.stockviewer.backend.valuation;

public record ValuationMetrics(
        String symbol,
        String corpCode,
        String name,
        String year,
        String fiscalDate,
        String priceDate,
        Double price,
        Double marketCap,
        Double totalAssets,
        Double totalLiabilities,
        Double totalEquity,
        Double netIncome,
        Double operatingIncome,
        Double revenue,
        Double per,
        Double pbr,
        Double roe,
        Double debtRatio,
        Double perScore,
        Double pbrScore,
        Double roeScore,
        Double debtScore,
        Double valuationScore) {
}
