package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Format of the {@code <id>.json} files written by {@code tooling/videoGrabber}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record StoreVideoJson(
        Long id,
        Integer width,
        Integer height,
        Double duration,
        String title,
        String user,
        Long timestamp,
        Meta meta) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Meta(
            String description,
            List<String> categories,
            List<String> tags,
            @JsonProperty("view_count") Long viewCount,
            @JsonProperty("like_count") Long likeCount,
            String channel,
            @JsonProperty("channel_follower_count") Long channelFollowerCount,
            List<StoreComment> comments) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StoreComment(
            String text,
            String author,
            Long timestamp,
            @JsonProperty("like_count") Long likeCount) {
    }
}
