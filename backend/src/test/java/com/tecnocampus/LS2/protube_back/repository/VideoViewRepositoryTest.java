package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.domain.VideoView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

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
