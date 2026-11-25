package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.domain.VideoView;
import com.tecnocampus.LS2.protube_back.dto.HistoryVideoDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class VideoViewRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private VideoViewRepository videoViewRepository;

    private User user;
    private Video video;

    @BeforeEach
    void setUp() {
        user = entityManager.persistFlushFind(new User("viewer1", "viewer1@example.com", "pass"));
        video = entityManager.persistFlushFind(new Video("A Video", "http://media/v.mp4", user));
    }

    @Test
    void testSaveAndFindVideoViews() {
        // Authenticated view
        VideoView authView = new VideoView(video, user);
        VideoView savedAuth = entityManager.persistFlushFind(authView);

        assertThat(savedAuth.getId()).isNotNull();
        assertThat(savedAuth.getVideo().getId()).isEqualTo(video.getId());
        assertThat(savedAuth.getViewer().getId()).isEqualTo(user.getId());
        assertThat(savedAuth.getViewedAt()).isNotNull();

        // Anonymous view (viewer is null)
        VideoView anonView = new VideoView(video);
        VideoView savedAnon = entityManager.persistFlushFind(anonView);

        assertThat(savedAnon.getId()).isNotNull();
        assertThat(savedAnon.getVideo().getId()).isEqualTo(video.getId());
        assertThat(savedAnon.getViewer()).isNull();

        long count = videoViewRepository.countByVideoId(video.getId());
        assertThat(count).isEqualTo(2L);

        List<VideoView> views = videoViewRepository.findByVideoId(video.getId());
        assertThat(views).hasSize(2);
    }

    @Test
    void countDailyViewsByUploaderGroupsByUtcDayInsideTheWindow() {
        Instant since = Instant.parse("2026-10-06T00:00:00Z");

        // Two views on 2026-11-03 (UTC), one of them anonymous; 23:30 UTC must not move to the next day
        persistView(user, "2026-11-03T00:10:00Z");
        persistView(null, "2026-11-03T23:30:00Z");
        persistView(user, "2026-11-04T08:00:00Z");
        // Before the window: excluded
        persistView(user, "2026-10-05T23:59:59Z");

        List<VideoViewRepository.DailyViewCount> rows =
                videoViewRepository.countDailyViewsByUploader(user.getId(), since);

        assertThat(rows).hasSize(2);
        VideoViewRepository.DailyViewCount nov3 = rows.stream()
                .filter(r -> r.getEpochDay().longValue() == LocalDate.parse("2026-11-03").toEpochDay())
                .findFirst().orElseThrow();
        assertThat(nov3.getTotal().longValue()).isEqualTo(2L);
        assertThat(nov3.getAuthenticated().longValue()).isEqualTo(1L);
        VideoViewRepository.DailyViewCount nov4 = rows.stream()
                .filter(r -> r.getEpochDay().longValue() == LocalDate.parse("2026-11-04").toEpochDay())
                .findFirst().orElseThrow();
        assertThat(nov4.getTotal().longValue()).isEqualTo(1L);
        assertThat(nov4.getAuthenticated().longValue()).isEqualTo(1L);
    }

    @Test
    void countDailyViewsByUploaderIgnoresOtherUploaders() {
        User other = entityManager.persistFlushFind(new User("other", "other@example.com", "pass"));
        assertThat(videoViewRepository.countDailyViewsByUploader(other.getId(), Instant.EPOCH)).isEmpty();
    }

    private void persistView(User viewer, String viewedAt) {
        persistView(video, viewer, viewedAt);
    }

    private void persistView(Video target, User viewer, String viewedAt) {
        VideoView view = viewer != null ? new VideoView(target, viewer) : new VideoView(target);
        view.setViewedAt(Instant.parse(viewedAt));
        entityManager.persistFlushFind(view);
    }

    @Test
    void findHistoryByViewerIdReturnsDistinctVideosOrderedByLatestView() {
        User other = entityManager.persistFlushFind(new User("other2", "other2@example.com", "pass"));
        Video second = entityManager.persistFlushFind(new Video("Second Video", "http://media/v2.mp4", other));
        second.setDuration(42.5);
        second.setViewCount(10L);
        second.setThumbnailUrl("v2.webp");
        entityManager.persistFlushFind(second);

        // User watches first video twice and second video once in between
        persistView(video, user, "2026-11-01T10:00:00Z");
        persistView(second, user, "2026-11-02T10:00:00Z");
        persistView(video, user, "2026-11-03T10:00:00Z");
        // Other user and anonymous views must not leak into user's history
        persistView(second, other, "2026-11-04T10:00:00Z");
        persistView(second, null, "2026-11-05T10:00:00Z");

        Page<HistoryVideoDto> page = videoViewRepository.findHistoryByViewerId(user.getId(), PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(2L);
        assertThat(page.getContent()).extracting(HistoryVideoDto::id).containsExactly(video.getId(), second.getId());
        assertThat(page.getContent().get(0).lastViewedAt()).isEqualTo(Instant.parse("2026-11-03T10:00:00Z"));
        assertThat(page.getContent().get(1).lastViewedAt()).isEqualTo(Instant.parse("2026-11-02T10:00:00Z"));
        assertThat(page.getContent().get(1).author()).isEqualTo("other2");
        assertThat(page.getContent().get(1).duration()).isEqualTo(42.5);
        assertThat(page.getContent().get(1).views()).isEqualTo(10L);
        assertThat(page.getContent().get(1).thumbnail()).isEqualTo("v2.webp");
    }

    @Test
    void clearViewerByViewerIdDetachesOnlyTargetUserViewsWithoutDeletingRows() {
        User other = entityManager.persistFlushFind(new User("other3", "other3@example.com", "pass"));
        persistView(video, user, "2026-11-01T10:00:00Z");
        persistView(video, user, "2026-11-02T10:00:00Z");
        persistView(video, other, "2026-11-03T10:00:00Z");

        int updated = videoViewRepository.clearViewerByViewerId(user.getId());

        assertThat(updated).isEqualTo(2);
        assertThat(videoViewRepository.findHistoryByViewerId(user.getId(), PageRequest.of(0, 10)).isEmpty()).isTrue();
        assertThat(videoViewRepository.countByVideoId(video.getId())).isEqualTo(3L);
        assertThat(videoViewRepository.findHistoryByViewerId(other.getId(), PageRequest.of(0, 10)).getTotalElements())
                .isEqualTo(1L);
    }

    @Test
    void testVideoViewSetters() {
        VideoView view = new VideoView();
        view.setVideo(video);
        view.setViewer(user);

        VideoView saved = entityManager.persistFlushFind(view);
        assertThat(saved.getVideo().getId()).isEqualTo(video.getId());
        assertThat(saved.getViewer().getId()).isEqualTo(user.getId());
        assertThat(saved.equals(saved)).isTrue();
        assertThat(saved.equals(null)).isFalse();
        assertThat(saved.equals(new Object())).isFalse();
        assertThat(saved.hashCode()).isEqualTo(saved.getId().hashCode());
    }
}
