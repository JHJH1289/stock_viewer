package com.stockviewer.backend.Board;

import java.time.LocalDateTime;

public record PostResponse(
    Long postId,
    Long boardId,
    Long userId,
    String username,
    String title,
    String content,
    String marketCode,
    String symbol,
    Boolean authorHolding,
    Long viewCount,
    Long recommendCount,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static PostResponse from(Post post, String username, String marketCode, String symbol, Boolean authorHolding) {
        return new PostResponse(
            post.getPostId(),
            post.getBoardId(),
            post.getUserId(),
            username,
            post.getTitle(),
            post.getContent(),
            marketCode,
            symbol,
            authorHolding,
            post.getViewCount(),
            post.getRecommendCount(),
            post.getCreatedAt(),
            post.getUpdatedAt()
        );
    }
}
