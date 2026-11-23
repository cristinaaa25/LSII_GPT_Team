package com.tecnocampus.LS2.protube_back.dto;

/** Result of PUT/DELETE /api/users/{username}/subscription: the channel's new state for the current user. */
public record SubscriptionStatusDto(
        String username,
        long subscriberCount,
        boolean subscribedByMe) {
}
