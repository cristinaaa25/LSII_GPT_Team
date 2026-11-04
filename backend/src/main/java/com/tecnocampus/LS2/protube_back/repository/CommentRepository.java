package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByVideoIdAndParentIsNullOrderByCreatedAtDesc(Long videoId);

    @EntityGraph(attributePaths = {"author", "video"})
    Page<Comment> findByVideoIdAndParentIsNullOrderByCreatedAtDesc(Long videoId, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "video"})
    List<Comment> findByParentIdOrderByCreatedAtAsc(Long parentId);

    long countByVideoId(Long videoId);
}
