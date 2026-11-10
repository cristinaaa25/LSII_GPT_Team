package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {
    Optional<CommentLike> findByCommentIdAndUserId(Long commentId, Long userId);
    long countByCommentId(Long commentId);
    boolean existsByCommentIdAndUserId(Long commentId, Long userId);

    /** Like count of each comment in {@code commentIds}, in one query; comments without likes are omitted. */
    @Query("""
            SELECT cl.comment.id AS commentId, COUNT(cl) AS likeCount
            FROM CommentLike cl
            WHERE cl.comment.id IN :commentIds
            GROUP BY cl.comment.id
            """)
    List<CommentLikeCount> countByCommentIds(@Param("commentIds") Collection<Long> commentIds);

    /** Ids of the comments in {@code commentIds} that {@code userId} has liked, in one query. */
    @Query("""
            SELECT cl.comment.id FROM CommentLike cl
            WHERE cl.user.id = :userId AND cl.comment.id IN :commentIds
            """)
    List<Long> findLikedCommentIds(@Param("userId") Long userId, @Param("commentIds") Collection<Long> commentIds);

    interface CommentLikeCount {
        Long getCommentId();

        long getLikeCount();
    }
}
