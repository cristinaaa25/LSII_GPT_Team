package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;
import java.util.List;

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
        String thumbnailUrl) {
}
