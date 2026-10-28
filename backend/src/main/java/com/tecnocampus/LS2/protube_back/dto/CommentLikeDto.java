package com.tecnocampus.LS2.protube_back.dto;

public record CommentLikeDto(
        Long commentId,
        long likeCount,
        boolean likedByMe
) {}
