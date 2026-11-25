package com.tecnocampus.LS2.protube_back.dto;

import java.util.List;

/**
 * Public profile. {@code subscribedByMe} is {@code false} for anonymous viewers (also with an invalid or expired
 * token) and on your own profile.
 */
public record UserProfileDto(
        Long id,
        String username,
        String displayName,
        String avatarUrl,
        String description,
        List<VideoSummaryDto> videos,
        long subscriberCount,
        boolean subscribedByMe
) {
}
