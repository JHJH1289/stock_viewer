package com.stockviewer.backend.Board;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.web.bind.annotation.RequestParam;

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
import com.stockviewer.backend.repository.HoldingRepository;
import com.stockviewer.backend.repository.UserRepository;

import jakarta.validation.Valid;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final BoardRepository boardRepository;
    private final StockRepository stockRepository;
    private final HoldingRepository holdingRepository;
    private final UserRepository userRepository;

    record PagedResponse(List<PostResponse> content, int totalPages, long totalElements) {}

    @GetMapping
    public PagedResponse getGeneralPosts(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        Board board = findBoardBySlug("free");
        var result = postRepository.findByBoardIdOrderByCreatedAtDesc(board.getBoardId(), PageRequest.of(page, size))
                .map(this::toResponse);
        return new PagedResponse(result.getContent(), result.getTotalPages(), result.getTotalElements());
    }

    @GetMapping("/stock/{symbol}")
    public List<PostResponse> getStockPosts(@PathVariable("symbol") String symbol) {
        return findStockBoard(symbol)
                .map(board -> postRepository.findByBoardIdOrderByCreatedAtDesc(board.getBoardId())
                        .stream().map(this::toResponse).toList())
                .orElseGet(List::of);
    }

    @GetMapping("/markets/{marketCode}")
    public List<PostResponse> getMarketPosts(
            @PathVariable("marketCode") String marketCode,
            @RequestParam(name = "size", defaultValue = "5") int size) {
        String normalizedMarketCode = normalizeBoardMarketCode(marketCode);
        List<Long> boardIds = boardRepository
                .findByBoardTypeAndMarketCodeAndHiddenOrderBySortOrderAsc("STOCK", normalizedMarketCode, 0)
                .stream()
                .map(Board::getBoardId)
                .toList();

        if (boardIds.isEmpty()) {
            return List.of();
        }

        int safeSize = Math.max(1, Math.min(size, 20));
        return postRepository.findByBoardIdInOrderByCreatedAtDesc(boardIds, PageRequest.of(0, safeSize))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public PostResponse getPost(@PathVariable("id") Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        return toResponse(post);
    }

    @PostMapping
    public PostResponse createPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PostRequest request) {
        User user = resolveUser(userDetails);
        Board board = findBoardBySlug("free");
        Post post = Post.builder()
                .boardId(board.getBoardId())
                .userId(user.getId())
                .title(request.title())
                .content(request.content())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        Post saved = postRepository.save(post);
        return toResponse(Objects.requireNonNull(saved));
    }

    @PostMapping("/stock/{symbol}")
    public PostResponse createStockPost(
            @PathVariable("symbol") String symbol,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PostRequest request) {
        User user = resolveUser(userDetails);
        Board board = findOrCreateStockBoard(symbol);
        Post post = Post.builder()
                .boardId(board.getBoardId())
                .userId(user.getId())
                .title(request.title())
                .content(request.content())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        Post saved = postRepository.save(post);
        return toResponse(Objects.requireNonNull(saved));
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
        return toResponse(Objects.requireNonNull(saved));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deletePost(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = resolveUser(userDetails);
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        if (!Objects.equals(post.getUserId(), user.getId())) {
            throw new IllegalStateException("본인 글만 삭제할 수 있습니다.");
        }
        commentRepository.deleteByPostId(id);
        postRepository.delete(post);
        return ResponseEntity.noContent().build();
    }

    private User resolveUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }

    private Board findBoardBySlug(String slug) {
        return boardRepository.findByBoardSlug(slug)
                .orElseThrow(() -> new IllegalStateException("게시판을 찾을 수 없습니다: " + slug));
    }

    private Optional<Board> findStockBoard(String symbol) {
        String normalizedSymbol = symbol.toUpperCase();
        String stockMarketCode = stockMarketCode(normalizedSymbol);
        return stockRepository.findByMarketCodeAndSymbol(stockMarketCode, normalizedSymbol)
                .flatMap(stock -> boardRepository.findByStockId(stock.getStockId()));
    }

    private Board findOrCreateStockBoard(String symbol) {
        String normalizedSymbol = symbol.toUpperCase();
        String stockMarketCode = stockMarketCode(normalizedSymbol);
        Stock stock = stockRepository.findByMarketCodeAndSymbol(stockMarketCode, normalizedSymbol)
                .orElseGet(() -> stockRepository.save(Stock.builder()
                        .marketCode(stockMarketCode)
                        .symbol(normalizedSymbol)
                        .stockName(normalizedSymbol)
                        .createdAt(LocalDateTime.now())
                        .build()));

        return boardRepository.findByStockId(stock.getStockId())
                .orElseGet(() -> boardRepository.save(Board.builder()
                        .boardSlug("stocks/" + boardMarketCode(stockMarketCode) + "/" + normalizedSymbol)
                        .boardName(normalizedSymbol + " 게시판")
                        .boardDescription(normalizedSymbol + " 종목 게시판")
                        .boardType("STOCK")
                        .marketCode(boardMarketCode(stockMarketCode))
                        .stockId(stock.getStockId())
                        .writeRole("USER")
                        .hidden(0)
                        .sortOrder(100)
                        .createdAt(LocalDateTime.now())
                        .build()));
    }

    private PostResponse toResponse(Post post) {
        String username = userRepository.findById(post.getUserId())
                .map(User::getUsername)
                .orElse("-");
        Optional<Board> board = boardRepository.findById(post.getBoardId());
        String marketCode = board.map(Board::getMarketCode).orElse(null);
        String symbol = board
                .flatMap(foundBoard -> foundBoard.getStockId() == null ? Optional.empty() : stockRepository.findById(foundBoard.getStockId()))
                .map(Stock::getSymbol)
                .orElse(null);
        Boolean authorHolding = hasAuthorHolding(post.getUserId(), marketCode, symbol);
        return PostResponse.from(post, username, marketCode, symbol, authorHolding);
    }

    private Boolean hasAuthorHolding(Long userId, String marketCode, String symbol) {
        if (userId == null || marketCode == null || symbol == null) {
            return false;
        }
        String holdingMarketCode = "KR".equals(marketCode) ? "KRX" : "NASDAQ";
        return holdingRepository
                .findByUserIdAndSymbolAndMarketCode(userId, symbol.toUpperCase(), holdingMarketCode)
                .isPresent();
    }

    private String stockMarketCode(String symbol) {
        return symbol.matches("\\d{6}") ? "KRX" : "NASDAQ";
    }

    private String boardMarketCode(String stockMarketCode) {
        return "KRX".equals(stockMarketCode) ? "KR" : "US";
    }

    private String normalizeBoardMarketCode(String marketCode) {
        String normalized = marketCode.toUpperCase();
        if ("KRX".equals(normalized)) {
            return "KR";
        }
        if ("NASDAQ".equals(normalized) || "NYSE".equals(normalized) || "AMEX".equals(normalized)) {
            return "US";
        }
        return normalized;
    }
}
