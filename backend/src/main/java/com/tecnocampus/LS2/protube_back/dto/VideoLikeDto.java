package com.tecnocampus.LS2.protube_back.dto;

public record VideoLikeDto(
        Long videoId,
        long likeCount,
        boolean likedByMe
) {}
