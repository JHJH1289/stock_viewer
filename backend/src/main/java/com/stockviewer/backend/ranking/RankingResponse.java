package com.stockviewer.backend.ranking;

public record RankingResponse(
    int    rank,
    String username,
    double profitRate,
    double totalValue,
    double totalCost
) {}
