package com.stockviewer.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.stockviewer.backend.entity.Holding;

public interface HoldingRepository extends JpaRepository<Holding, Long> {
    Optional<Holding> findByUserIdAndSymbol(Long userId, String symbol);
    List<Holding> findByUserId(Long userId);
}
