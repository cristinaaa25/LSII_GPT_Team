package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;

/** A channel (user) the current user is subscribed to, as listed by GET /api/users/me/subscriptions. */
public record ChannelDto(
        Long id,
        String username,
        String displayName,
        String avatarUrl,
        long subscriberCount,
        // ISO-8601 string: @EnableWebMvc (MvcConfig) bypasses spring.jackson.* properties
        @JsonFormat(shape = JsonFormat.Shape.STRING) Instant subscribedAt) {
}
