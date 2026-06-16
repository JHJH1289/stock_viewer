package com.stockviewer.backend.stockmaster;

import java.util.List;
import java.util.Optional;

public interface StockMasterRepository {
    List<StockMaster> search(String keyword, int limit);

    Optional<StockMaster> findBySymbol(String symbol);

    int count();
}
