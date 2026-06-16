package com.stockviewer.backend.stockmaster;

public record StockMasterDto(
        String symbol,
        String name,
        String country,
        String exchange,
        String market,
        String currency,
        String corpCode,
        String source) {
    public static StockMasterDto from(StockMaster stock) {
        return new StockMasterDto(
                stock.symbol(),
                stock.name(),
                stock.country(),
                stock.exchange(),
                stock.market(),
                stock.currency(),
                stock.corpCode(),
                stock.source());
    }
}
