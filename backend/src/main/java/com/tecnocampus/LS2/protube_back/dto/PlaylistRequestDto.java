package com.tecnocampus.LS2.protube_back.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request payload to create or rename a playlist. */
public record PlaylistRequestDto(
        @NotBlank(message = "Playlist name is required")
        @Size(max = 100, message = "Playlist name must be at most 100 characters")
        String name) {
}
