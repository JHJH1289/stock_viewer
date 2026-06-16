package com.stockviewer.backend.stockmaster;

import java.util.List;

public interface StockMasterRepository {
    List<StockMaster> search(String keyword, int limit);

    int count();
}
