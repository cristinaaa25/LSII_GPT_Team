package com.tecnocampus.LS2.protube_back.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequestDto(
        @Size(max = 100, message = "Display name cannot exceed 100 characters")
        String displayName,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description
) {
}
