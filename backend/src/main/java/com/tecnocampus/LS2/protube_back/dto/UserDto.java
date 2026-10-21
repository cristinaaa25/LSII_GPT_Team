package com.tecnocampus.LS2.protube_back.dto;

public record UserDto(
        Long id,
        String username,
        String email,
        String avatarUrl,
        String description
) {}
