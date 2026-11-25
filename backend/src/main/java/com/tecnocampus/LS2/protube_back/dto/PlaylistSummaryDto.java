package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;

/** Summary of a user's playlist ({@code GET /api/users/me/playlists}, create/rename/video toggle responses). */
public record PlaylistSummaryDto(
        Long id,
        String name,
        boolean watchLater,
        long videoCount,
        boolean containsVideo,
        @JsonFormat(shape = JsonFormat.Shape.STRING) Instant createdAt) {
}
