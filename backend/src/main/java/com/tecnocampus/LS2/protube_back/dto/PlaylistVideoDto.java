package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;

/** Video entry inside a playlist, matching {@link VideoSummaryDto} card fields plus {@code addedAt}. */
public record PlaylistVideoDto(
        Long id,
        String title,
        String author,
        Double duration,
        Long views,
        String thumbnail,
        @JsonFormat(shape = JsonFormat.Shape.STRING) Instant addedAt) {
}
