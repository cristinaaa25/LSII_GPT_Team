package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;
import java.util.List;

/**
 * Video page data. {@code authorSubscriberCount} and {@code subscribedByMe} describe the author's channel;
 * {@code subscribedByMe} is false for anonymous viewers (also with an invalid or expired token) and on your own video.
 */
public record VideoDetailDto(
        Long id,
        String title,
        String description,
        List<String> tags,
        List<String> categories,
        String author,
        // ISO-8601 string: @EnableWebMvc (MvcConfig) bypasses spring.jackson.* properties
        @JsonFormat(shape = JsonFormat.Shape.STRING) Instant uploadDate,
        Long views,
        Long likes,
        Long commentCount,
        String videoUrl,
        String thumbnailUrl,
        boolean likedByMe,
        long authorSubscriberCount,
        boolean subscribedByMe) {

    public VideoDetailDto(Long id, String title, String description, List<String> tags, List<String> categories,
                          String author, Instant uploadDate, Long views, Long likes, Long commentCount,
                          String videoUrl, String thumbnailUrl) {
        this(id, title, description, tags, categories, author, uploadDate, views, likes, commentCount, videoUrl, thumbnailUrl, false);
    }

    public VideoDetailDto(Long id, String title, String description, List<String> tags, List<String> categories,
                          String author, Instant uploadDate, Long views, Long likes, Long commentCount,
                          String videoUrl, String thumbnailUrl, boolean likedByMe) {
        this(id, title, description, tags, categories, author, uploadDate, views, likes, commentCount, videoUrl,
                thumbnailUrl, likedByMe, 0L, false);
    }
}
