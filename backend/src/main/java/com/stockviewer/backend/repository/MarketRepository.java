package com.stockviewer.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.stockviewer.backend.entity.Market;

public interface MarketRepository extends JpaRepository<Market, String> {
}
