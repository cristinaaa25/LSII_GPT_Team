package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;
import java.util.List;

public record CommentDto(
        Long id,
        Long videoId,
        String text,
        String author,
        @JsonFormat(shape = JsonFormat.Shape.STRING) Instant createdAt,
        long likeCount,
        boolean likedByMe,
        Long parentId,
        List<CommentDto> replies
) {}
