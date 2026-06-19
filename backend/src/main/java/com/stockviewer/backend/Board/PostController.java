package com.stockviewer.backend.Board;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    record PagedResponse(List<PostResponse> content, int totalPages, long totalElements) {}

    @GetMapping
    public PagedResponse getGeneralPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var result = postRepository.findBySymbolIsNullOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(PostResponse::from);
        return new PagedResponse(result.getContent(), result.getTotalPages(), result.getTotalElements());
    }

    @GetMapping("/stock/{symbol}")
    public List<PostResponse> getStockPosts(@PathVariable("symbol") String symbol) {
        return postRepository.findBySymbolOrderByCreatedAtDesc(symbol.toUpperCase())
                .stream().map(PostResponse::from).toList();
    }

    @GetMapping("/{id}")
    public PostResponse getPost(@PathVariable("id") Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        return PostResponse.from(post);
    }

    @PostMapping
    public PostResponse createPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PostRequest request) {
        User user = resolveUser(userDetails);
        Post post = Post.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .title(request.title())
                .content(request.content())
                .symbol(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        Post saved = postRepository.save(post);
        return PostResponse.from(Objects.requireNonNull(saved));
    }

    @PostMapping("/stock/{symbol}")
    public PostResponse createStockPost(
            @PathVariable("symbol") String symbol,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PostRequest request) {
        User user = resolveUser(userDetails);
        Post post = Post.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .title(request.title())
                .content(request.content())
                .symbol(symbol.toUpperCase())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        Post saved = postRepository.save(post);
        return PostResponse.from(Objects.requireNonNull(saved));
    }

    @PutMapping("/{id}")
    public PostResponse updatePost(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PostRequest request) {
        User user = resolveUser(userDetails);
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        if (!Objects.equals(post.getUserId(), user.getId())) {
            throw new IllegalStateException("본인 글만 수정할 수 있습니다.");
        }
        post.update(request.title(), request.content());
        Post saved = postRepository.save(post);
        return PostResponse.from(Objects.requireNonNull(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = resolveUser(userDetails);
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        if (!Objects.equals(post.getUserId(), user.getId())) {
            throw new IllegalStateException("본인 글만 삭제할 수 있습니다.");
        }
        postRepository.delete(post);
        return ResponseEntity.noContent().build();
    }

    private User resolveUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }
}
