package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
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
import java.util.ArrayList;
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

        List<Video> userVideos = videoRepository.findByUploaderId(uploader.getId(), PageRequest.of(0, 10)).getContent();
        assertThat(userVideos).hasSize(1);
        assertThat(userVideos.get(0).getTitle()).isEqualTo("Spring Boot Tutorial");

        List<Video> searchResults = videoRepository.findByTitleContainingIgnoreCase("boot");
        assertThat(searchResults).hasSize(1);

        List<Video> emptyResults = videoRepository.findByTitleContainingIgnoreCase("nonexistent");
        assertThat(emptyResults).isEmpty();
    }

    private Video persistVideo(String title, String description, List<String> tags, Instant createdAt) {
        Video video = new Video(title, description, "v.mp4", "v.webp", 10.0, 640, 360, uploader);
        video.setTags(new ArrayList<>(tags));
        video.setCreatedAt(createdAt);
        return entityManager.persistFlushFind(video);
    }

    /** Builds the three patterns like {@code VideoService} does; {@code term} must already be escaped. */
    private Page<Video> search(String term, PageRequest page) {
        return videoRepository.search("%" + term + "%", term + "%", "% " + term + "%", page);
    }

    @Test
    void searchRanksTitleMatchesAboveTagMatchesAboveDescriptionMatches() {
        Instant now = Instant.now();
        // The description match is the newest, so only relevance can put it last
        Video inDescription = persistVideo("Morning walk", "A walk with my CAT", List.of("outdoors"), now);
        Video inTag = persistVideo("Funny pets", "Compilation", List.of("Cats"), now.minusSeconds(60));
        Video inTitle = persistVideo("Cat videos", "Compilation", List.of("pets"), now.minusSeconds(120));
        persistVideo("Dogs", "Only dogs here", List.of("dogs"), now.minusSeconds(180));

        Page<Video> result = search("cat", PageRequest.of(0, 10));

        assertThat(result.getContent()).containsExactly(inTitle, inTag, inDescription);
        assertThat(result.getTotalElements()).isEqualTo(3);
    }

    @Test
    void searchBreaksRelevanceTiesNewestFirstAndPaginates() {
        Instant now = Instant.now();
        Video older = persistVideo("Cat one", null, List.of(), now.minusSeconds(60));
        Video newer = persistVideo("Cat two", null, List.of(), now);

        Page<Video> first = search("cat", PageRequest.of(0, 1));
        Page<Video> second = search("cat", PageRequest.of(1, 1));

        assertThat(first.getContent()).containsExactly(newer);
        assertThat(second.getContent()).containsExactly(older);
        assertThat(first.getTotalElements()).isEqualTo(2);
    }

    @Test
    void searchReturnsEmptyPageWhenNothingMatches() {
        persistVideo("Cat videos", "Compilation", List.of("pets"), Instant.now());

        Page<Video> result = search("nonexistent", PageRequest.of(0, 10));

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    void searchTreatsEscapedWildcardsLiterally() {
        Video percent = persistVideo("100% cats", null, List.of(), Instant.now());
        persistVideo("1000 cats", null, List.of(), Instant.now());

        Page<Video> result = search("100\\%", PageRequest.of(0, 10));

        assertThat(result.getContent()).containsExactly(percent);
    }

    @Test
    void searchRanksTitlePrefixAboveTitleWordPrefixAboveMatchInsideAWord() {
        Instant now = Instant.now();
        // Newest first would give the opposite order, so only relevance can produce this one
        Video inside = persistVideo("Education", null, List.of(), now);
        Video wordPrefix = persistVideo("Funny cat", null, List.of(), now.minusSeconds(60));
        Video titlePrefix = persistVideo("Cat videos", null, List.of(), now.minusSeconds(120));

        Page<Video> result = search("cat", PageRequest.of(0, 10));

        assertThat(result.getContent()).containsExactly(titlePrefix, wordPrefix, inside);
    }

    @Test
    void searchRanksTagPrefixBelowTitleWordPrefixButAboveMatchesInsideAWord() {
        Instant now = Instant.now();
        Video insideTitle = persistVideo("Bobcat facts", "Concatenated catalog", List.of("bobcat"), now);
        Video tagPrefix = persistVideo("Pets", null, List.of("Catnip"), now.minusSeconds(60));
        Video wordPrefix = persistVideo("My cat", null, List.of(), now.minusSeconds(120));

        Page<Video> result = search("cat", PageRequest.of(0, 10));

        // Title, tag and description matches inside words (4 + 2 + 1) still lose to one tag prefix (16)
        assertThat(result.getContent()).containsExactly(wordPrefix, tagPrefix, insideTitle);
    }

    @Test
    void searchTreatsEscapedWildcardsLiterallyInPrefixPatterns() {
        Instant now = Instant.now();
        // An unescaped "_" would make "axb tricks" a title prefix match (64) and put it first
        Video wildcardLookalike = persistVideo("axb tricks", "about a_b", List.of(), now);
        Video literalWordPrefix = persistVideo("Learn a_b", null, List.of(), now.minusSeconds(60));

        Page<Video> result = search("a\\_b", PageRequest.of(0, 10));

        assertThat(result.getContent()).containsExactly(literalWordPrefix, wildcardLookalike);
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
