package com.stockviewer.backend.Board;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.stockviewer.backend.entity.User;
import com.stockviewer.backend.repository.UserRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @GetMapping
    public List<CommentResponse> getComments(@PathVariable("postId") Long postId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId)
                .stream().map(this::toResponse).toList();
    }

    @PostMapping
    public CommentResponse createComment(
            @PathVariable("postId") Long postId,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CommentRequest request) {
        postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        User user = resolveUser(userDetails);
        Comment comment = Comment.builder()
                .postId(postId)
                .userId(user.getId())
                .content(request.content())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return toResponse(commentRepository.save(comment));
    }

    @PutMapping("/{commentId}")
    public CommentResponse updateComment(
            @PathVariable("postId") Long postId,
            @PathVariable("commentId") Long commentId,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CommentRequest request) {
        User user = resolveUser(userDetails);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));
        if (!Objects.equals(comment.getPostId(), postId))
            throw new IllegalArgumentException("댓글이 해당 게시글에 속하지 않습니다.");
        if (!Objects.equals(comment.getUserId(), user.getId()))
            throw new IllegalStateException("본인 댓글만 수정할 수 있습니다.");
        comment.update(request.content());
        return toResponse(commentRepository.save(comment));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable("postId") Long postId,
            @PathVariable("commentId") Long commentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = resolveUser(userDetails);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));
        if (!Objects.equals(comment.getPostId(), postId))
            throw new IllegalArgumentException("댓글이 해당 게시글에 속하지 않습니다.");
        if (!Objects.equals(comment.getUserId(), user.getId()))
            throw new IllegalStateException("본인 댓글만 삭제할 수 있습니다.");
        commentRepository.delete(comment);
        return ResponseEntity.noContent().build();
    }

    private User resolveUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }

    private CommentResponse toResponse(Comment comment) {
        String username = userRepository.findById(comment.getUserId())
                .map(User::getUsername)
                .orElse("-");
        return CommentResponse.from(comment, username);
    }
}
