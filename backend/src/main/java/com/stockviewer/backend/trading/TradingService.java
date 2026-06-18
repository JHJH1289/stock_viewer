package com.stockviewer.backend.trading;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.stockviewer.backend.dto.trading.BalanceResponse;
import com.stockviewer.backend.dto.trading.BuyRequest;
import com.stockviewer.backend.dto.trading.HoldingDto;
import com.stockviewer.backend.dto.trading.SellRequest;
import com.stockviewer.backend.dto.trading.TradeOrderDto;
import com.stockviewer.backend.entity.Balance;
import com.stockviewer.backend.entity.Holding;
import com.stockviewer.backend.entity.Market;
import com.stockviewer.backend.entity.TradeOrder;
import com.stockviewer.backend.repository.BalanceRepository;
import com.stockviewer.backend.repository.HoldingRepository;
import com.stockviewer.backend.repository.MarketRepository;
import com.stockviewer.backend.repository.TradeOrderRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TradingService {

    private final BalanceRepository balanceRepository;
    private final HoldingRepository holdingRepository;
    private final TradeOrderRepository tradeOrderRepository;
    private final MarketRepository marketRepository;

    public BalanceResponse getBalance(Long userId) {
        Balance balance = getOrCreateBalance(userId);
        return new BalanceResponse(balance.getKrwAmount(), balance.getUsdAmount());
    }

    public List<HoldingDto> getHoldings(Long userId) {
        return holdingRepository.findByUserId(userId).stream()
                .map(HoldingDto::from)
                .toList();
    }

    public List<TradeOrderDto> getOrders(Long userId) {
        return tradeOrderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(TradeOrderDto::from)
                .toList();
    }

    @Transactional
    public TradeOrderDto buy(Long userId, BuyRequest req) {
        Market market = marketRepository.findById(req.getMarketCode())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 마켓: " + req.getMarketCode()));

        BigDecimal total = req.getPrice().multiply(BigDecimal.valueOf(req.getQuantity()));
        Balance balance = getOrCreateBalance(userId);

        if ("KRW".equals(market.getCurrency())) {
            if (balance.getKrwAmount().compareTo(total) < 0)
                throw new IllegalStateException("KRW 잔고가 부족합니다.");
            balance.setKrwAmount(balance.getKrwAmount().subtract(total));
        } else {
            if (balance.getUsdAmount().compareTo(total) < 0)
                throw new IllegalStateException("USD 잔고가 부족합니다.");
            balance.setUsdAmount(balance.getUsdAmount().subtract(total));
        }
        balance.setUpdatedAt(LocalDateTime.now());
        balanceRepository.save(balance);

        Holding holding = holdingRepository.findByUserIdAndSymbol(userId, req.getSymbol()).orElse(null);
        if (holding == null) {
            holding = Holding.builder()
                    .userId(userId).symbol(req.getSymbol()).stockName(req.getStockName())
                    .marketCode(req.getMarketCode()).quantity(req.getQuantity())
                    .avgBuyPrice(req.getPrice()).updatedAt(LocalDateTime.now()).build();
        } else {
            BigDecimal prevTotal = holding.getAvgBuyPrice().multiply(BigDecimal.valueOf(holding.getQuantity()));
            long newQty = holding.getQuantity() + req.getQuantity();
            BigDecimal newAvg = prevTotal.add(total).divide(BigDecimal.valueOf(newQty), 4, RoundingMode.HALF_UP);
            holding.setQuantity(newQty);
            holding.setAvgBuyPrice(newAvg);
            holding.setUpdatedAt(LocalDateTime.now());
        }
        holdingRepository.save(holding);

        TradeOrder order = TradeOrder.builder()
                .userId(userId).symbol(req.getSymbol()).stockName(req.getStockName())
                .marketCode(req.getMarketCode()).orderType("BUY").quantity(req.getQuantity())
                .price(req.getPrice()).totalAmount(total).currency(market.getCurrency())
                .createdAt(LocalDateTime.now()).build();
        return TradeOrderDto.from(tradeOrderRepository.save(order));
    }

    @Transactional
    public TradeOrderDto sell(Long userId, SellRequest req) {
        Market market = marketRepository.findById(req.getMarketCode())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 마켓: " + req.getMarketCode()));

        Holding holding = holdingRepository.findByUserIdAndSymbol(userId, req.getSymbol())
                .orElseThrow(() -> new IllegalStateException("보유하지 않은 종목입니다."));

        if (holding.getQuantity() < req.getQuantity())
            throw new IllegalStateException("보유 수량이 부족합니다. (보유: " + holding.getQuantity() + ")");

        BigDecimal total = req.getPrice().multiply(BigDecimal.valueOf(req.getQuantity()));
        Balance balance = getOrCreateBalance(userId);

        if ("KRW".equals(market.getCurrency())) {
            balance.setKrwAmount(balance.getKrwAmount().add(total));
        } else {
            balance.setUsdAmount(balance.getUsdAmount().add(total));
        }
        balance.setUpdatedAt(LocalDateTime.now());
        balanceRepository.save(balance);

        long remaining = holding.getQuantity() - req.getQuantity();
        if (remaining == 0) {
            holdingRepository.delete(holding);
        } else {
            holding.setQuantity(remaining);
            holding.setUpdatedAt(LocalDateTime.now());
            holdingRepository.save(holding);
        }

        TradeOrder order = TradeOrder.builder()
                .userId(userId).symbol(req.getSymbol()).stockName(holding.getStockName())
                .marketCode(req.getMarketCode()).orderType("SELL").quantity(req.getQuantity())
                .price(req.getPrice()).totalAmount(total).currency(market.getCurrency())
                .createdAt(LocalDateTime.now()).build();
        return TradeOrderDto.from(tradeOrderRepository.save(order));
    }

    public Balance getOrCreateBalance(Long userId) {
        return balanceRepository.findByUserId(userId).orElseGet(() -> {
            Balance b = Balance.builder()
                    .userId(userId).krwAmount(new BigDecimal("10000000"))
                    .usdAmount(BigDecimal.ZERO).updatedAt(LocalDateTime.now()).build();
            return balanceRepository.save(b);
        });
    }
}
