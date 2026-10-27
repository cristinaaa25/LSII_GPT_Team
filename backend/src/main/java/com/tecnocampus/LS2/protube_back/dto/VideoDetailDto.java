package com.tecnocampus.LS2.protube_back.dto;

import java.time.Instant;
import java.util.List;

public record VideoDetailDto(
        Long id,
        String title,
        String description,
        List<String> tags,
        List<String> categories,
        String author,
        Instant uploadDate,
        Long views,
        Long likes,
        Long commentCount,
        String videoUrl,
        String thumbnailUrl) {

    public VideoDetailDto(
            Long id,
            String title,
            String description,
            List<String> tags,
            List<String> categories,
            String author,
            Instant uploadDate,
            Long views,
            Long likes,
            Long commentCount) {
        this(id, title, description, tags, categories, author, uploadDate, views, likes, commentCount, null, null);
    }

    public VideoDetailDto(
            String title,
            String description,
            List<String> tags,
            List<String> categories,
            String author,
            Instant uploadDate,
            Long views,
            Long likes,
            Long commentCount) {
        this(null, title, description, tags, categories, author, uploadDate, views, likes, commentCount, null, null);
    }
}
