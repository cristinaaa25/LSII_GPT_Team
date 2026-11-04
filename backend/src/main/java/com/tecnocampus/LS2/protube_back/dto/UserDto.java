package com.tecnocampus.LS2.protube_back.dto;

public record UserDto(
        Long id,
        String username,
        String email,
        String displayName,
        String avatarUrl,
        String description
) {
    public UserDto(Long id, String username, String email, String avatarUrl, String description) {
        this(id, username, email, null, avatarUrl, description);
    }
}
