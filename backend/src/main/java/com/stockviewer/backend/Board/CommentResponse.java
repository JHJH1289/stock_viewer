package com.stockviewer.backend.Board;

import java.time.LocalDateTime;

public record CommentResponse(
    Long commentId,
    Long postId,
    Long userId,
    String username,
    String content,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static CommentResponse from(Comment c) {
        return new CommentResponse(
            c.getCommentId(), c.getPostId(), c.getUserId(),
            c.getUsername(), c.getContent(), c.getCreatedAt(), c.getUpdatedAt()
        );
    }
}
