package com.tecnocampus.LS2.protube_back.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequestDto(
        @NotBlank(message = "Comment text is required")
        @Size(max = 2000, message = "Comment must not exceed 2000 characters")
        String text
) {}
