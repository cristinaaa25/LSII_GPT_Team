package com.tecnocampus.LS2.protube_back.dto;

import java.util.List;

public record UserProfileDto(
        Long id,
        String username,
        String displayName,
        String avatarUrl,
        String description,
        List<VideoSummaryDto> videos
) {
}
