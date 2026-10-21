package com.tecnocampus.LS2.protube_back.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequestDto(
        @NotBlank(message = "Email or username is required")
        String email,

        @NotBlank(message = "Password is required")
        String password
) {}
