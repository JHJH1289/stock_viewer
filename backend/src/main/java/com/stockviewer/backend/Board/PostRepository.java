package com.stockviewer.backend.Board;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByBoardIdOrderByCreatedAtDesc(Long boardId, Pageable pageable);
    List<Post> findByBoardIdOrderByCreatedAtDesc(Long boardId);
    List<Post> findByBoardIdInOrderByCreatedAtDesc(List<Long> boardIds, Pageable pageable);
}
