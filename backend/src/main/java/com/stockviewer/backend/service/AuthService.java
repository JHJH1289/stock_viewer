package com.stockviewer.backend.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.stockviewer.backend.dto.auth.AuthResponse;
import com.stockviewer.backend.dto.auth.LoginRequest;
import com.stockviewer.backend.dto.auth.SignupRequest;
import com.stockviewer.backend.entity.Balance;
import com.stockviewer.backend.entity.Role;
import com.stockviewer.backend.entity.User;
import com.stockviewer.backend.repository.BalanceRepository;
import com.stockviewer.backend.repository.UserRepository;
import com.stockviewer.backend.security.JwtTokenProvider;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final BigDecimal INITIAL_KRW_BALANCE = new BigDecimal("10000000");
    private static final BigDecimal INITIAL_USD_BALANCE = new BigDecimal("10000");

    private final UserRepository userRepository;
    private final BalanceRepository balanceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .createdAt(LocalDateTime.now())
                .build();

        User savedUser = userRepository.save(user);

        balanceRepository.save(Balance.builder()
                .userId(savedUser.getId())
                .krwAmount(INITIAL_KRW_BALANCE)
                .usdAmount(INITIAL_USD_BALANCE)
                .updatedAt(LocalDateTime.now())
                .build());

        String token = jwtTokenProvider.generateToken(savedUser.getEmail());
        return new AuthResponse(token, savedUser.getUsername(), savedUser.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();

        String token = jwtTokenProvider.generateToken(user.getEmail());
        return new AuthResponse(token, user.getUsername(), user.getEmail());
    }
}
