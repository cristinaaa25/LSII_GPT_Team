package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;
import java.util.List;

/** Full playlist details with its videos ordered newest added first ({@code GET /api/playlists/{id}}). */
public record PlaylistDetailDto(
        Long id,
        String name,
        boolean watchLater,
        @JsonFormat(shape = JsonFormat.Shape.STRING) Instant createdAt,
        List<PlaylistVideoDto> videos) {
}
