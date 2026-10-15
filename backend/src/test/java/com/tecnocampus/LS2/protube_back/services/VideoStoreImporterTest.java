package com.tecnocampus.LS2.protube_back.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.domain.Comment;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({VideoStoreImporter.class, ObjectMapper.class})
class VideoStoreImporterTest {

    private static final String VIDEO_42 = """
            {
                "id": 42,
                "width": 1920,
                "height": 1080,
                "duration": 31.5,
                "title": "Funny cats",
                "user": "Cat Channel",
                "timestamp": 1700000000,
                "meta": {
                    "description": "Cats doing things",
                    "categories": ["Pets & Animals"],
                    "tags": ["cats", "funny", "cats", ""],
                    "view_count": 123456,
                    "like_count": 789,
                    "channel": "Cat Channel",
                    "channel_follower_count": 1000,
                    "comments": [
                        {"text": "So cute", "author": "alice", "timestamp": 1700000100, "like_count": 3},
                        {"text": "Meow", "author": "bob", "timestamp": 1700000200, "like_count": 0},
                        {"text": "Me again", "author": "alice", "timestamp": 1700000300, "like_count": 1},
                        {"text": " ", "author": "carol", "timestamp": 1700000400, "like_count": 0}
                    ]
                }
            }
            """;

    private static final String VIDEO_43 = """
            {"id": 43, "title": "Dogs", "user": "Cat Channel", "duration": 10.0,
             "meta": {"view_count": 5, "comments": []}}
            """;

    @TempDir
    Path store;

    @Autowired
    VideoStoreImporter importer;

    @Autowired
    VideoRepository videoRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    CommentRepository commentRepository;

    @Autowired
    TestEntityManager entityManager;

    @Test
    void importsVideoWithAuthorMetadataAndComments() throws IOException {
        write("42.json", VIDEO_42);

        assertThat(importer.importAll(store)).isEqualTo(1);
        entityManager.flush();
        entityManager.clear();

        List<Video> videos = videoRepository.findAll();
        assertThat(videos).hasSize(1);
        Video video = videos.get(0);
        assertThat(video.getStoreId()).isEqualTo(42L);
        assertThat(video.getTitle()).isEqualTo("Funny cats");
        assertThat(video.getDescription()).isEqualTo("Cats doing things");
        assertThat(video.getVideoUrl()).isEqualTo("42.mp4");
        assertThat(video.getThumbnailUrl()).isEqualTo("42.webp");
        assertThat(video.getDuration()).isEqualTo(31.5);
        assertThat(video.getWidth()).isEqualTo(1920);
        assertThat(video.getHeight()).isEqualTo(1080);
        assertThat(video.getViewCount()).isEqualTo(123456L);
        assertThat(video.getLikeCount()).isEqualTo(789L);
        assertThat(video.getCreatedAt()).isEqualTo(Instant.ofEpochSecond(1700000000));
        assertThat(video.getCategories()).containsExactly("Pets & Animals");
        assertThat(video.getTags()).containsExactly("cats", "funny");
        assertThat(video.getUploader().getUsername()).isEqualTo("Cat Channel");

        List<Comment> comments = commentRepository.findByVideoIdAndParentIsNullOrderByCreatedAtDesc(video.getId());
        assertThat(comments).extracting(Comment::getText).containsExactly("Me again", "Meow", "So cute");
        assertThat(comments).extracting(c -> c.getAuthor().getUsername()).containsExactly("alice", "bob", "alice");
        assertThat(comments.get(2).getCreatedAt()).isEqualTo(Instant.ofEpochSecond(1700000100));

        // channel + 2 distinct comment authors; blank comment skipped
        assertThat(userRepository.findAll()).extracting(User::getUsername)
                .containsExactlyInAnyOrder("Cat Channel", "alice", "bob");
        User placeholder = userRepository.findByUsername("alice").orElseThrow();
        assertThat(placeholder.getPassword()).isEqualTo(VideoStoreImporter.NO_PASSWORD);
        assertThat(placeholder.getEmail()).endsWith(VideoStoreImporter.PLACEHOLDER_EMAIL_DOMAIN);
    }

    @Test
    void importIsIdempotentAndReusesExistingAuthors() throws IOException {
        write("42.json", VIDEO_42);
        assertThat(importer.importAll(store)).isEqualTo(1);

        write("43.json", VIDEO_43);
        assertThat(importer.importAll(store)).isEqualTo(1);
        assertThat(importer.importAll(store)).isZero();

        assertThat(videoRepository.count()).isEqualTo(2);
        assertThat(commentRepository.count()).isEqualTo(3);
        assertThat(userRepository.count()).isEqualTo(3);
    }

    @Test
    void skipsInvalidAndUnrelatedFiles() throws IOException {
        write("1.json", "{ not json");
        write("2.json", "{\"title\": \"no id\"}");
        write("3_tmp.info.json", VIDEO_42);
        write("notes.txt", "hello");
        write("42.json", VIDEO_42);

        assertThat(importer.importAll(store)).isEqualTo(1);
        assertThat(videoRepository.count()).isEqualTo(1);
    }

    @Test
    void usesFallbacksWhenMetadataIsMissing() throws IOException {
        write("44.json", "{\"id\": 44, \"title\": \"Bare\"}");

        assertThat(importer.importAll(store)).isEqualTo(1);

        Video video = videoRepository.findAll().get(0);
        assertThat(video.getViewCount()).isZero();
        assertThat(video.getUploader().getUsername()).isEqualTo(VideoStoreImporter.UNKNOWN_USER);
    }

    @Test
    void returnsZeroWhenStoreDoesNotExist() {
        assertThat(importer.importAll(store.resolve("missing"))).isZero();
    }

    @Test
    void placeholderEmailIsDeterministicAndFitsColumn() {
        String longName = "x".repeat(50);
        assertThat(VideoStoreImporter.placeholderEmail(longName))
                .isEqualTo(VideoStoreImporter.placeholderEmail(longName))
                .hasSizeLessThanOrEqualTo(100);
        assertThat(VideoStoreImporter.placeholderEmail("a")).isNotEqualTo(VideoStoreImporter.placeholderEmail("b"));
    }

    private void write(String name, String content) throws IOException {
        Files.writeString(store.resolve(name), content, StandardCharsets.UTF_8);
    }
}
