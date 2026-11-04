package com.tecnocampus.LS2.protube_back.dto;

import java.util.List;

public record UserAnalyticsDto(
        AnalyticsTotalsDto totals,
        List<VideoAnalyticsDto> videos,
        List<DailyViewsDto> viewsPerDay
) {
}
