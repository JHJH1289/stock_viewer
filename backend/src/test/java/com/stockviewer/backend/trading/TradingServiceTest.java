package com.stockviewer.backend.trading;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.stockviewer.backend.dto.trading.SellRequest;
import com.stockviewer.backend.entity.Balance;
import com.stockviewer.backend.entity.Holding;
import com.stockviewer.backend.entity.Market;
import com.stockviewer.backend.entity.TradeOrder;
import com.stockviewer.backend.repository.BalanceRepository;
import com.stockviewer.backend.repository.HoldingRepository;
import com.stockviewer.backend.repository.MarketRepository;
import com.stockviewer.backend.repository.TradeOrderRepository;

@ExtendWith(MockitoExtension.class)
class TradingServiceTest {

    @Mock
    private BalanceRepository balanceRepository;

    @Mock
    private HoldingRepository holdingRepository;

    @Mock
    private TradeOrderRepository tradeOrderRepository;

    @Mock
    private MarketRepository marketRepository;

    @InjectMocks
    private TradingService tradingService;

    @Test
    void sellUsesNormalizedSymbolAndMarketCode() {
        long userId = 1L;
        Balance balance = Balance.builder()
                .userId(userId)
                .krwAmount(new BigDecimal("10000000"))
                .usdAmount(new BigDecimal("10000"))
                .updatedAt(LocalDateTime.now())
                .build();
        Holding holding = Holding.builder()
                .holdingId(10L)
                .userId(userId)
                .symbol("AAPL")
                .stockName("Apple")
                .marketCode("NASDAQ")
                .quantity(5L)
                .avgBuyPrice(new BigDecimal("150"))
                .updatedAt(LocalDateTime.now())
                .build();

        SellRequest request = new SellRequest();
        request.setSymbol(" aapl ");
        request.setMarketCode(" nasdaq ");
        request.setQuantity(2);
        request.setPrice(new BigDecimal("200"));

        when(marketRepository.findById("NASDAQ")).thenReturn(Optional.of(Market.builder()
                .marketCode("NASDAQ")
                .marketName("NASDAQ")
                .country("USA")
                .currency("USD")
                .build()));
        when(holdingRepository.findByUserIdAndSymbolAndMarketCode(userId, "AAPL", "NASDAQ"))
                .thenReturn(Optional.of(holding));
        when(balanceRepository.findByUserId(userId)).thenReturn(Optional.of(balance));
        when(tradeOrderRepository.save(any(TradeOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        tradingService.sell(userId, request);

        assertThat(balance.getUsdAmount()).isEqualByComparingTo("10400");
        assertThat(holding.getQuantity()).isEqualTo(3);
        verify(holdingRepository).save(holding);

        ArgumentCaptor<TradeOrder> orderCaptor = ArgumentCaptor.forClass(TradeOrder.class);
        verify(tradeOrderRepository).save(orderCaptor.capture());
        TradeOrder order = orderCaptor.getValue();
        assertThat(order.getOrderType()).isEqualTo("SELL");
        assertThat(order.getSymbol()).isEqualTo("AAPL");
        assertThat(order.getMarketCode()).isEqualTo("NASDAQ");
        assertThat(order.getTotalAmount()).isEqualByComparingTo("400");
        assertThat(order.getCurrency()).isEqualTo("USD");
    }
}
