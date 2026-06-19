package com.stockviewer.backend.Board;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardRepository extends JpaRepository<Board, Long> {
    Optional<Board> findByBoardSlug(String boardSlug);
    Optional<Board> findByStockId(Long stockId);
    List<Board> findByBoardTypeAndMarketCodeAndHiddenOrderBySortOrderAsc(String boardType, String marketCode, Integer hidden);
}
