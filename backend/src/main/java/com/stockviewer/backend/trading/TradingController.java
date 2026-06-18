package com.stockviewer.backend.trading;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.stockviewer.backend.dto.trading.BalanceResponse;
import com.stockviewer.backend.dto.trading.BuyRequest;
import com.stockviewer.backend.dto.trading.HoldingDto;
import com.stockviewer.backend.dto.trading.SellRequest;
import com.stockviewer.backend.dto.trading.TradeOrderDto;
import com.stockviewer.backend.entity.User;
import com.stockviewer.backend.repository.UserRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/trading")
@RequiredArgsConstructor
public class TradingController {

    private final TradingService tradingService;
    private final UserRepository userRepository;

    @GetMapping("/balance")
    public ResponseEntity<BalanceResponse> balance(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tradingService.getBalance(resolveUserId(userDetails)));
    }

    @GetMapping("/holdings")
    public ResponseEntity<List<HoldingDto>> holdings(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tradingService.getHoldings(resolveUserId(userDetails)));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<TradeOrderDto>> orders(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tradingService.getOrders(resolveUserId(userDetails)));
    }

    @PostMapping("/buy")
    public ResponseEntity<TradeOrderDto> buy(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BuyRequest request) {
        return ResponseEntity.ok(tradingService.buy(resolveUserId(userDetails), request));
    }

    @PostMapping("/sell")
    public ResponseEntity<TradeOrderDto> sell(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SellRequest request) {
        return ResponseEntity.ok(tradingService.sell(resolveUserId(userDetails), request));
    }

    private Long resolveUserId(UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
        return user.getId();
    }
}
