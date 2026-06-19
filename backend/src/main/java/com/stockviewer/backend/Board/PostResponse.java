package com.stockviewer.backend.Board;

import java.time.LocalDateTime;

public record PostResponse(
    Long postId,
    Long userId,
    String username,
    String title,
    String content,
    String symbol,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static PostResponse from(Post post) {
        return new PostResponse(
            post.getPostId(),
            post.getUserId(),
            post.getUsername(),
            post.getTitle(),
            post.getContent(),
            post.getSymbol(),
            post.getCreatedAt(),
            post.getUpdatedAt()
        );
    }
}
