package com.stockviewer.backend.Board;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "BOARDS")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Board {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "BOARD_ID")
    private Long boardId;

    @Column(name = "BOARD_SLUG", nullable = false, length = 120)
    private String boardSlug;

    @Column(name = "BOARD_NAME", nullable = false, length = 100)
    private String boardName;

    @Column(name = "BOARD_DESCRIPTION", length = 500)
    private String boardDescription;

    @Column(name = "BOARD_TYPE", nullable = false, length = 30)
    private String boardType;

    @Column(name = "MARKET_CODE", length = 10)
    private String marketCode;

    @Column(name = "STOCK_ID")
    private Long stockId;

    @Column(name = "WRITE_ROLE", nullable = false, length = 20)
    @Builder.Default
    private String writeRole = "USER";

    @Column(nullable = false)
    @Builder.Default
    private Integer hidden = 0;

    @Column(name = "SORT_ORDER", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;
}
