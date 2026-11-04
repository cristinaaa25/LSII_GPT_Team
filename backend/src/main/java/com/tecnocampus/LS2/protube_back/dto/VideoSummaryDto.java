package com.tecnocampus.LS2.protube_back.dto;

/**
 * Card data for the video catalog. {@code thumbnail} is a path relative to {@code /media/}.
 */
public record VideoSummaryDto(
        Long id,
        String title,
        String author,
        Double duration,
        Long views,
        String thumbnail) {
}
