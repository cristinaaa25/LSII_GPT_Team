package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;

/**
 * Distinct video from the user's watch history ({@code GET /api/users/me/history}).
 * Keeps the same card fields as {@link VideoSummaryDto} plus {@code lastViewedAt}.
 */
public record HistoryVideoDto(
        Long id,
        String title,
        String author,
        Double duration,
        Long views,
        String thumbnail,
        // ISO-8601 string: @EnableWebMvc (MvcConfig) bypasses spring.jackson.* properties
        @JsonFormat(shape = JsonFormat.Shape.STRING) Instant lastViewedAt) {
}
