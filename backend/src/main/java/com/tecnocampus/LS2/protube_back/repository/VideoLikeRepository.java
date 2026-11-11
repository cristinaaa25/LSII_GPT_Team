package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.VideoLike;
import com.tecnocampus.LS2.protube_back.domain.VideoLikeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VideoLikeRepository extends JpaRepository<VideoLike, VideoLikeId> {
    Optional<VideoLike> findByVideoIdAndUserId(Long videoId, Long userId);
    boolean existsByVideoIdAndUserId(Long videoId, Long userId);
    long countByVideoId(Long videoId);
}
