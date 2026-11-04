package com.tecnocampus.LS2.protube_back.dto;

public record DailyViewsDto(
        String date,
        long views,
        long authenticatedViews,
        long anonymousViews
) {
}
