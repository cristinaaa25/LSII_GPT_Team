package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.VideoView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface VideoViewRepository extends JpaRepository<VideoView, Long> {
    long countByVideoId(Long videoId);
    List<VideoView> findByVideoId(Long videoId);

    @Query("SELECT v FROM VideoView v WHERE v.video.uploader.id = :uploaderId AND v.viewedAt >= :since ORDER BY v.viewedAt ASC")
    List<VideoView> findByUploaderIdAndViewedAtAfter(@Param("uploaderId") Long uploaderId, @Param("since") Instant since);
}
