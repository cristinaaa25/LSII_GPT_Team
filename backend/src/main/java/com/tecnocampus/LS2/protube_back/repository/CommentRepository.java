package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    @EntityGraph(attributePaths = {"author", "video"})
    Page<Comment> findByVideoIdAndParentIsNullOrderByCreatedAtDesc(Long videoId, Pageable pageable);

    long countByVideoId(Long videoId);

    /** Replies of all the given root comments in one query, oldest first, with their authors. */
    @EntityGraph(attributePaths = {"author"})
    List<Comment> findByParentIdInOrderByCreatedAtAsc(Collection<Long> parentIds);

    /** Number of comments (replies included) of each video uploaded by {@code uploaderId}, in one query. */
    @Query("""
            SELECT c.video.id AS videoId, COUNT(c) AS commentCount
            FROM Comment c
            WHERE c.video.uploader.id = :uploaderId
            GROUP BY c.video.id
            """)
    List<VideoCommentCount> countByUploaderGroupedByVideo(@Param("uploaderId") Long uploaderId);

    interface VideoCommentCount {
        Long getVideoId();

        long getCommentCount();
    }
}
