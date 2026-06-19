package com.stockviewer.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.stockviewer.backend.entity.Holding;

public interface HoldingRepository extends JpaRepository<Holding, Long> {
    Optional<Holding> findByUserIdAndSymbol(Long userId, String symbol);

    @Query("""
            select h
            from Holding h
            where h.userId = :userId
              and upper(trim(h.symbol)) = :symbol
              and upper(trim(h.marketCode)) = :marketCode
            """)
    Optional<Holding> findByUserIdAndSymbolAndMarketCode(
            @Param("userId") Long userId,
            @Param("symbol") String symbol,
            @Param("marketCode") String marketCode);

    List<Holding> findByUserId(Long userId);
}
