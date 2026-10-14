package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByVideoIdAndParentIsNullOrderByCreatedAtDesc(Long videoId);
    List<Comment> findByParentIdOrderByCreatedAtAsc(Long parentId);
}
