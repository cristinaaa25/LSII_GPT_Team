package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.VideoView;
import com.tecnocampus.LS2.protube_back.dto.HistoryVideoDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface VideoViewRepository extends JpaRepository<VideoView, Long> {
    long countByVideoId(Long videoId);
    List<VideoView> findByVideoId(Long videoId);
    boolean existsByVideoIdAndViewerIdAndViewedAtGreaterThanEqual(Long videoId, Long viewerId, Instant since);

    /**
     * Views of the videos uploaded by {@code uploaderId} since {@code since}, grouped by UTC day in one query.
     * The day is the number of whole days since the Unix epoch, so it does not depend on the time zone of the
     * database session (a {@code CAST(... AS DATE)} would use the server's zone, not UTC).
     */
    @Query("""
            SELECT FLOOR(EXTRACT(EPOCH FROM v.viewedAt) / 86400) AS epochDay,
                   COUNT(v) AS total,
                   SUM(CASE WHEN v.viewer IS NULL THEN 0 ELSE 1 END) AS authenticated
            FROM VideoView v
            WHERE v.video.uploader.id = :uploaderId AND v.viewedAt >= :since
            GROUP BY FLOOR(EXTRACT(EPOCH FROM v.viewedAt) / 86400)
            """)
    List<DailyViewCount> countDailyViewsByUploader(@Param("uploaderId") Long uploaderId,
                                                   @Param("since") Instant since);

    interface DailyViewCount {
        Number getEpochDay();

        Number getTotal();

        Number getAuthenticated();
    }

    /**
     * Distinct videos viewed by {@code viewerId}, ordered by most recent view first.
     * Uses a single grouped query projecting directly into {@link HistoryVideoDto} to avoid N+1 selects.
     */
    @Query(value = """
            SELECT new com.tecnocampus.LS2.protube_back.dto.HistoryVideoDto(
                v.id, v.title, u.username, v.duration, v.viewCount, v.thumbnailUrl, MAX(vv.viewedAt)
            )
            FROM VideoView vv
            JOIN vv.video v
            JOIN v.uploader u
            WHERE vv.viewer.id = :viewerId
            GROUP BY v.id, v.title, u.username, v.duration, v.viewCount, v.thumbnailUrl
            ORDER BY MAX(vv.viewedAt) DESC, MAX(vv.id) DESC
            """,
            countQuery = """
            SELECT COUNT(DISTINCT vv.video.id)
            FROM VideoView vv
            WHERE vv.viewer.id = :viewerId
            """)
    Page<HistoryVideoDto> findHistoryByViewerId(@Param("viewerId") Long viewerId, Pageable pageable);

    /**
     * Clears {@code viewerId}'s watch history by detaching the user from their views,
     * keeping the view rows intact so video view counts and uploader analytics do not change.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE VideoView vv SET vv.viewer = null WHERE vv.viewer.id = :viewerId")
    int clearViewerByViewerId(@Param("viewerId") Long viewerId);
}
