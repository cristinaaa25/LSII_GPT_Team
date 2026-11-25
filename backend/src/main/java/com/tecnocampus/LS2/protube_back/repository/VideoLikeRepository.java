package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.VideoLike;
import com.tecnocampus.LS2.protube_back.domain.VideoLikeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VideoLikeRepository extends JpaRepository<VideoLike, VideoLikeId> {
    Optional<VideoLike> findByVideoIdAndUserId(Long videoId, Long userId);
    boolean existsByVideoIdAndUserId(Long videoId, Long userId);
    long countByVideoId(Long videoId);

    /**
     * Bulk delete that returns the number of removed rows, so a concurrent duplicate unlike removes 0 rows and
     * the caller only decrements the counter once.
     */
    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM VideoLike l WHERE l.video.id = :videoId AND l.user.id = :userId")
    int deleteByVideoIdAndUserId(@Param("videoId") Long videoId, @Param("userId") Long userId);
}
