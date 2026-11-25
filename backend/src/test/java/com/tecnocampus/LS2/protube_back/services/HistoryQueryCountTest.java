package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.domain.VideoView;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Watch history runs a fixed number of SQL statements regardless of how many videos or views the user has (no N+1).
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@ActiveProfiles("test")
@Transactional
class HistoryQueryCountTest {

    // user lookup + grouped history page (uploader username joined in the same projection; no count query when page is not full)
    private static final long HISTORY_QUERIES_NO_COUNT = 2;

    @Autowired
    HistoryService historyService;

    @Autowired
    EntityManager entityManager;

    @Autowired
    EntityManagerFactory entityManagerFactory;

    private Statistics statistics;

    @BeforeEach
    void setUp() {
        statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    }

    @Test
    void historyRunsTheSameQueriesForFewAndManyWatchedVideos() {
        User few = viewerWithHistory("hfew", 2);
        User many = viewerWithHistory("hmany", 15);

        assertThat(countHistoryQueries(few)).isEqualTo(HISTORY_QUERIES_NO_COUNT);
        assertThat(countHistoryQueries(many)).isEqualTo(HISTORY_QUERIES_NO_COUNT);
    }

    private long countHistoryQueries(User viewer) {
        entityManager.flush();
        entityManager.clear();
        statistics.clear();
        // Page size above total videos so Spring Data skips the count query and the measurement is exact
        assertThat(historyService.getHistory(viewer.getUsername(), 0, 50).content()).isNotEmpty();
        return statistics.getPrepareStatementCount();
    }

    private User viewerWithHistory(String prefix, int videosCount) {
        User viewer = persist(new User("hc_" + prefix, "hc_" + prefix + "@example.com", "pass"));
        for (int i = 0; i < videosCount; i++) {
            User uploader = persist(new User("hc_up_" + prefix + "_" + i, "hc_up_" + prefix + "_" + i + "@example.com", "pass"));
            Video video = persist(new Video("Video " + prefix + " " + i, "/media/" + prefix + i + ".mp4", uploader));
            // Multiple views per video to exercise GROUP BY + MAX without N+1
            VideoView v1 = new VideoView(video, viewer);
            v1.setViewedAt(Instant.parse("2026-11-01T10:00:00Z").plusSeconds(i));
            persist(v1);
            VideoView v2 = new VideoView(video, viewer);
            v2.setViewedAt(Instant.parse("2026-11-02T10:00:00Z").plusSeconds(i));
            persist(v2);
        }
        return viewer;
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
