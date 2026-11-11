package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.domain.VideoLike;
import com.tecnocampus.LS2.protube_back.domain.VideoLikeId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class VideoLikeRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private VideoLikeRepository videoLikeRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User uploader;
    private User liker;
    private Video video;

    @BeforeEach
    void setUp() {
        String suffix = java.util.UUID.randomUUID().toString().substring(0, 8);
        uploader = entityManager.persistFlushFind(new User("up_" + suffix, "up_" + suffix + "@example.com", "pass"));
        liker = entityManager.persistFlushFind(new User("liker_" + suffix, "liker_" + suffix + "@example.com", "pass"));
        video = entityManager.persistFlushFind(new Video("A Video", "http://media/v.mp4", uploader));
    }

    @Test
    void migrationV5IsApplied() {
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM \"flyway_schema_history\" WHERE \"version\" = '5' AND \"success\" = TRUE",
                Integer.class);
        assertThat(applied).isEqualTo(1);
    }

    @Test
    void testSaveAndFindVideoLike() {
        VideoLike like = new VideoLike(video, liker);
        VideoLike saved = entityManager.persistFlushFind(like);

        assertThat(saved.getVideo().getId()).isEqualTo(video.getId());
        assertThat(saved.getUser().getId()).isEqualTo(liker.getId());
        assertThat(saved.getCreatedAt()).isNotNull();

        Optional<VideoLike> found = videoLikeRepository.findByVideoIdAndUserId(video.getId(), liker.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getVideo().getId()).isEqualTo(video.getId());

        assertThat(videoLikeRepository.existsByVideoIdAndUserId(video.getId(), liker.getId())).isTrue();
        assertThat(videoLikeRepository.countByVideoId(video.getId())).isEqualTo(1L);

        videoLikeRepository.delete(found.get());
        entityManager.flush();

        assertThat(videoLikeRepository.existsByVideoIdAndUserId(video.getId(), liker.getId())).isFalse();
        assertThat(videoLikeRepository.countByVideoId(video.getId())).isEqualTo(0L);
    }

    @Test
    void testUniqueConstraintOnUserAndVideo() {
        VideoLike like1 = new VideoLike(video, liker);
        entityManager.persistFlushFind(like1);

        assertThatThrownBy(() -> {
            jdbcTemplate.update("INSERT INTO video_likes (user_id, video_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                    liker.getId(), video.getId());
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void testCascadeDeleteOnUser() {
        VideoLike like = new VideoLike(video, liker);
        entityManager.persistFlushFind(like);

        jdbcTemplate.update("DELETE FROM users WHERE id = ?", liker.getId());
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM video_likes WHERE user_id = ?", Integer.class, liker.getId());
        assertThat(count).isEqualTo(0);
    }

    @Test
    void testCascadeDeleteOnVideo() {
        VideoLike like = new VideoLike(video, liker);
        entityManager.persistFlushFind(like);

        jdbcTemplate.update("DELETE FROM videos WHERE id = ?", video.getId());
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM video_likes WHERE video_id = ?", Integer.class, video.getId());
        assertThat(count).isEqualTo(0);
    }

    @Test
    void testVideoLikeAndIdEquality() {
        VideoLike like = new VideoLike();
        like.setVideo(video);
        like.setUser(liker);

        assertThat(like.getVideo()).isEqualTo(video);
        assertThat(like.getUser()).isEqualTo(liker);
        assertThat(like.equals(like)).isTrue();
        assertThat(like.equals(null)).isFalse();
        assertThat(like.equals(new Object())).isFalse();

        VideoLike other = new VideoLike(video, liker);
        assertThat(like).isEqualTo(other);
        assertThat(like.hashCode()).isEqualTo(other.hashCode());

        VideoLikeId id1 = new VideoLikeId(liker.getId(), video.getId());
        VideoLikeId id2 = new VideoLikeId();
        id2.setUser(liker.getId());
        id2.setVideo(video.getId());

        assertThat(id1.getUser()).isEqualTo(liker.getId());
        assertThat(id1.getVideo()).isEqualTo(video.getId());
        assertThat(id1).isEqualTo(id2);
        assertThat(id1.hashCode()).isEqualTo(id2.hashCode());
        assertThat(id1.equals(id1)).isTrue();
        assertThat(id1.equals(null)).isFalse();
        assertThat(id1.equals("different")).isFalse();
    }
}
