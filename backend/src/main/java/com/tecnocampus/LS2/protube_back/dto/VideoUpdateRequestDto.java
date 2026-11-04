package com.tecnocampus.LS2.protube_back.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Body of PUT /api/videos/{id}: replaces the editable metadata of a video. */
public record VideoUpdateRequestDto(
        @NotBlank(message = "Title is required")
        @Size(max = 255, message = "Title must not exceed 255 characters")
        String title,

        @NotBlank(message = "Description is required")
        @Size(max = 5000, message = "Description must not exceed 5000 characters")
        String description,

        @NotNull(message = "Tags are required (use an empty list for none)")
        @Size(max = 20, message = "A video can have at most 20 tags")
        List<@NotBlank(message = "Tags must not be blank")
             @Size(max = 50, message = "Tags must not exceed 50 characters") String> tags,

        @NotNull(message = "Categories are required (use an empty list for none)")
        @Size(max = 5, message = "A video can have at most 5 categories")
        List<@NotBlank(message = "Categories must not be blank")
             @Size(max = 100, message = "Categories must not exceed 100 characters") String> categories
) {}
