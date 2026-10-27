package com.tecnocampus.LS2.protube_back.dto;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class VideoDetailDtoTest {

    @Test
    void testConstructorsAndGetters() {
        Instant now = Instant.now();
        VideoDetailDto full = new VideoDetailDto(
                1L, "title", "desc", List.of("tag"), List.of("cat"),
                "author", now, 100L, 10L, 5L, "1.mp4", "1.webp");

        assertThat(full.id()).isEqualTo(1L);
        assertThat(full.title()).isEqualTo("title");
        assertThat(full.description()).isEqualTo("desc");
        assertThat(full.tags()).containsExactly("tag");
        assertThat(full.categories()).containsExactly("cat");
        assertThat(full.author()).isEqualTo("author");
        assertThat(full.uploadDate()).isEqualTo(now);
        assertThat(full.views()).isEqualTo(100L);
        assertThat(full.likes()).isEqualTo(10L);
        assertThat(full.commentCount()).isEqualTo(5L);
        assertThat(full.videoUrl()).isEqualTo("1.mp4");
        assertThat(full.thumbnailUrl()).isEqualTo("1.webp");

        VideoDetailDto withoutUrls = new VideoDetailDto(
                2L, "title2", "desc2", List.of("tag2"), List.of("cat2"),
                "author2", now, 200L, 20L, 10L);

        assertThat(withoutUrls.id()).isEqualTo(2L);
        assertThat(withoutUrls.videoUrl()).isNull();
        assertThat(withoutUrls.thumbnailUrl()).isNull();

        VideoDetailDto withoutIdAndUrls = new VideoDetailDto(
                "title3", "desc3", List.of("tag3"), List.of("cat3"),
                "author3", now, 300L, 30L, 15L);

        assertThat(withoutIdAndUrls.id()).isNull();
        assertThat(withoutIdAndUrls.title()).isEqualTo("title3");
    }
}
