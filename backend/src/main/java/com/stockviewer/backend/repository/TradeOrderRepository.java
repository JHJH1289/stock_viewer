package com.stockviewer.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.stockviewer.backend.entity.TradeOrder;

public interface TradeOrderRepository extends JpaRepository<TradeOrder, Long> {
    List<TradeOrder> findByUserIdOrderByCreatedAtDesc(Long userId);
}
