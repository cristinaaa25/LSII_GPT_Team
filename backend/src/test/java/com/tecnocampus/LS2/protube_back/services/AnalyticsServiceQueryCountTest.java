package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.Comment;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.domain.VideoView;
import com.tecnocampus.LS2.protube_back.dto.DailyViewsDto;
import com.tecnocampus.LS2.protube_back.dto.UserAnalyticsDto;
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
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * GET /api/users/me/analytics must run a fixed number of SQL statements whatever the number of videos, comments and
 * views (no count per video, no VideoView rows loaded). Counted with Hibernate statistics.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@ActiveProfiles("test")
@Transactional
class AnalyticsServiceQueryCountTest {

    // user + videos + grouped comment counts + views grouped by day
    private static final long EXPECTED_QUERIES = 4;

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private Statistics statistics;

    @BeforeEach
    void setUp() {
        statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    }

    @Test
    void runsTheSameQueriesForFewAndManyVideos() {
        userWithVideos("qa_few", 2);
        userWithVideos("qa_many", 15);

        assertThat(countQueries("qa_few")).isEqualTo(EXPECTED_QUERIES);
        assertThat(countQueries("qa_many")).isEqualTo(EXPECTED_QUERIES);
    }

    @Test
    void groupedQueriesKeepTheSameTotals() {
        userWithVideos("qa_totals", 3);
        entityManager.flush();
        entityManager.clear();

        UserAnalyticsDto result = analyticsService.getUserAnalytics("qa_totals");

        assertThat(result.totals().videos()).isEqualTo(3);
        assertThat(result.totals().comments()).isEqualTo(6);
        assertThat(result.videos()).allMatch(v -> v.comments() == 2);
        assertThat(result.viewsPerDay()).hasSize(30);
        DailyViewsDto today = result.viewsPerDay().get(29);
        assertThat(today.date()).isEqualTo(LocalDate.now(ZoneOffset.UTC).toString());
        assertThat(today.views()).isEqualTo(6);
        assertThat(today.authenticatedViews()).isEqualTo(3);
        assertThat(today.anonymousViews()).isEqualTo(3);
        long viewsInWindow = result.viewsPerDay().stream().mapToLong(DailyViewsDto::views).sum();
        assertThat(viewsInWindow).isEqualTo(6); // the 40-day-old views are outside the window
    }

    private long countQueries(String username) {
        // Start from an empty persistence context so nothing is served from the first-level cache
        entityManager.flush();
        entityManager.clear();
        statistics.clear();

        analyticsService.getUserAnalytics(username);

        return statistics.getPrepareStatementCount();
    }

    /** {@code videos} videos, each with 2 comments, 2 views today (1 anonymous) and 1 view 40 days ago. */
    private void userWithVideos(String username, int videos) {
        User user = persist(new User(username, username + "@example.com", "pass"));
        Instant today = Instant.now();
        for (int i = 0; i < videos; i++) {
            Video video = persist(new Video(username + " video " + i, "/media/" + username + i + ".mp4", user));
            persist(new Comment("First", video, user));
            persist(new Comment("Second", video, user));
            persistView(video, user, today);
            persistView(video, null, today);
            persistView(video, user, today.minus(40, ChronoUnit.DAYS));
        }
    }

    private void persistView(Video video, User viewer, Instant viewedAt) {
        VideoView view = viewer != null ? new VideoView(video, viewer) : new VideoView(video);
        view.setViewedAt(viewedAt);
        persist(view);
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
