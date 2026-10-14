package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
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
class VideoRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private VideoRepository videoRepository;

    private User uploader;

    @BeforeEach
    void setUp() {
        uploader = entityManager.persistFlushFind(new User("uploader1", "up1@example.com", "pass"));
    }

    @Test
    void testSaveAndFindVideos() {
        Video video = new Video("Spring Boot Tutorial", "Learn Spring Boot", "http://media/1.mp4", "http://media/1.webp", 120.5, 1920, 1080, uploader);
        Video saved = entityManager.persistFlushFind(video);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getTitle()).isEqualTo("Spring Boot Tutorial");
        assertThat(saved.getVideoUrl()).isEqualTo("http://media/1.mp4");
        assertThat(saved.getThumbnailUrl()).isEqualTo("http://media/1.webp");
        assertThat(saved.getDuration()).isEqualTo(120.5);
        assertThat(saved.getWidth()).isEqualTo(1920);
        assertThat(saved.getHeight()).isEqualTo(1080);
        assertThat(saved.getUploader().getId()).isEqualTo(uploader.getId());
        assertThat(saved.getCreatedAt()).isNotNull();

        List<Video> userVideos = videoRepository.findByUploaderId(uploader.getId());
        assertThat(userVideos).hasSize(1);
        assertThat(userVideos.get(0).getTitle()).isEqualTo("Spring Boot Tutorial");

        List<Video> searchResults = videoRepository.findByTitleContainingIgnoreCase("boot");
        assertThat(searchResults).hasSize(1);

        List<Video> emptyResults = videoRepository.findByTitleContainingIgnoreCase("nonexistent");
        assertThat(emptyResults).isEmpty();
    }

    @Test
    void testVideoSettersAndConstructors() {
        Video video = new Video("Basic Title", "http://media/basic.mp4", uploader);
        video.setTitle("Updated Title");
        video.setDescription("Updated Desc");
        video.setVideoUrl("http://media/updated.mp4");
        video.setThumbnailUrl("http://media/updated.webp");
        video.setDuration(45.0);
        video.setWidth(1280);
        video.setHeight(720);

        User uploader2 = entityManager.persistFlushFind(new User("uploader2", "up2@example.com", "pass"));
        video.setUploader(uploader2);

        Video saved = entityManager.persistFlushFind(video);
        assertThat(saved.getTitle()).isEqualTo("Updated Title");
        assertThat(saved.getDescription()).isEqualTo("Updated Desc");
        assertThat(saved.getUploader().getId()).isEqualTo(uploader2.getId());
        assertThat(saved.equals(saved)).isTrue();
        assertThat(saved.equals(null)).isFalse();
        assertThat(saved.equals(new Object())).isFalse();
        assertThat(saved.hashCode()).isEqualTo(saved.getId().hashCode());
    }
}
