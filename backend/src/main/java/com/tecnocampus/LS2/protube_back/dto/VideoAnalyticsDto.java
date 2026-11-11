package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;

public record VideoAnalyticsDto(
        Long id,
        String title,
        String thumbnailUrl,
        @JsonFormat(shape = JsonFormat.Shape.STRING) Instant uploadDate,
        Double duration,
        long views,
        long likes,
        long comments
) {
}
