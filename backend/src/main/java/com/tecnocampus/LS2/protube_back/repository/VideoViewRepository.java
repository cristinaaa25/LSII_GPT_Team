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
}
