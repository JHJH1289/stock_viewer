package com.stockviewer.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.stockviewer.backend.entity.Balance;

public interface BalanceRepository extends JpaRepository<Balance, Long> {
    Optional<Balance> findByUserId(Long userId);
}
