package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.domain.VideoView;
import com.tecnocampus.LS2.protube_back.dto.DailyViewsDto;
import com.tecnocampus.LS2.protube_back.dto.UserAnalyticsDto;
import com.tecnocampus.LS2.protube_back.dto.VideoAnalyticsDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoViewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AnalyticsServiceTest {

    private UserRepository userRepository;
    private VideoRepository videoRepository;
    private VideoViewRepository videoViewRepository;
    private CommentRepository commentRepository;
    private Clock fixedClock;
    private AnalyticsService analyticsService;

    private User alice;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        videoRepository = mock(VideoRepository.class);
        videoViewRepository = mock(VideoViewRepository.class);
        commentRepository = mock(CommentRepository.class);

        Instant fixedInstant = Instant.parse("2026-11-04T12:00:00Z");
        fixedClock = Clock.fixed(fixedInstant, ZoneOffset.UTC);

        analyticsService = new AnalyticsService(
                userRepository,
                videoRepository,
                videoViewRepository,
                commentRepository,
                fixedClock
        );

        alice = new User("alice", "alice@example.com", "pass");
        alice.setId(1L);
    }

    @Test
    void getUserAnalyticsWithDataAggregatesCorrectly() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        Video v1 = new Video("Video 1", "v1.mp4", alice);
        v1.setId(10L);
        v1.setViewCount(100L);
        v1.setLikeCount(10L);
        v1.setDuration(60.0);
        v1.setThumbnailUrl("/media/t1.webp");

        Video v2 = new Video("Video 2", "v2.mp4", alice);
        v2.setId(20L);
        v2.setViewCount(50L);
        v2.setLikeCount(5L);
        v2.setDuration(120.0);
        v2.setThumbnailUrl("/media/t2.webp");

        when(videoRepository.findByUploaderIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(v1, v2));

        when(commentRepository.countByVideoId(10L)).thenReturn(2L);
        when(commentRepository.countByVideoId(20L)).thenReturn(1L);

        User bob = new User("bob", "bob@example.com", "pass");
        bob.setId(2L);

        VideoView viewTodayAuth = new VideoView(v1, bob);
        viewTodayAuth.setViewedAt(Instant.parse("2026-11-04T08:00:00Z"));

        VideoView viewTodayAnon = new VideoView(v1);
        viewTodayAnon.setViewedAt(Instant.parse("2026-11-04T09:00:00Z"));

        VideoView viewFiveDaysAgoAuth = new VideoView(v2, bob);
        viewFiveDaysAgoAuth.setViewedAt(Instant.parse("2026-10-30T10:00:00Z"));

        when(videoViewRepository.findByUploaderIdAndViewedAtAfter(eq(1L), any(Instant.class)))
                .thenReturn(List.of(viewFiveDaysAgoAuth, viewTodayAuth, viewTodayAnon));

        UserAnalyticsDto result = analyticsService.getUserAnalytics("alice");

        // Verify totals
        assertThat(result.totals().videos()).isEqualTo(2);
        assertThat(result.totals().views()).isEqualTo(150);
        assertThat(result.totals().likes()).isEqualTo(15);
        assertThat(result.totals().comments()).isEqualTo(3);

        // Verify per-video list
        assertThat(result.videos()).hasSize(2);
        VideoAnalyticsDto dto1 = result.videos().get(0);
        assertThat(dto1.id()).isEqualTo(10L);
        assertThat(dto1.title()).isEqualTo("Video 1");
        assertThat(dto1.views()).isEqualTo(100L);
        assertThat(dto1.likes()).isEqualTo(10L);
        assertThat(dto1.comments()).isEqualTo(2L);
        assertThat(dto1.duration()).isEqualTo(60.0);

        VideoAnalyticsDto dto2 = result.videos().get(1);
        assertThat(dto2.id()).isEqualTo(20L);
        assertThat(dto2.title()).isEqualTo("Video 2");
        assertThat(dto2.views()).isEqualTo(50L);
        assertThat(dto2.likes()).isEqualTo(5L);
        assertThat(dto2.comments()).isEqualTo(1L);

        // Verify 30-day daily views
        assertThat(result.viewsPerDay()).hasSize(30);

        // First item should be 29 days ago (2026-10-06)
        DailyViewsDto firstDay = result.viewsPerDay().get(0);
        assertThat(firstDay.date()).isEqualTo("2026-10-06");
        assertThat(firstDay.views()).isEqualTo(0);

        // 2026-10-30 is index 24 (2026-10-06 + 24 days = 2026-10-30)
        DailyViewsDto dayOct30 = result.viewsPerDay().stream()
                .filter(d -> d.date().equals("2026-10-30"))
                .findFirst()
                .orElseThrow();
        assertThat(dayOct30.views()).isEqualTo(1);
        assertThat(dayOct30.authenticatedViews()).isEqualTo(1);
        assertThat(dayOct30.anonymousViews()).isEqualTo(0);

        // Last item is today (2026-11-04)
        DailyViewsDto lastDay = result.viewsPerDay().get(29);
        assertThat(lastDay.date()).isEqualTo("2026-11-04");
        assertThat(lastDay.views()).isEqualTo(2);
        assertThat(lastDay.authenticatedViews()).isEqualTo(1);
        assertThat(lastDay.anonymousViews()).isEqualTo(1);
    }

    @Test
    void getUserAnalyticsWithoutDataReturnsZerosAndEmptyVideos() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(videoRepository.findByUploaderIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());

        UserAnalyticsDto result = analyticsService.getUserAnalytics("alice");

        assertThat(result.totals().videos()).isEqualTo(0);
        assertThat(result.totals().views()).isEqualTo(0);
        assertThat(result.totals().likes()).isEqualTo(0);
        assertThat(result.totals().comments()).isEqualTo(0);
        assertThat(result.videos()).isEmpty();
        assertThat(result.viewsPerDay()).hasSize(30);
        assertThat(result.viewsPerDay()).allMatch(d -> d.views() == 0 && d.authenticatedViews() == 0 && d.anonymousViews() == 0);
    }

    @Test
    void getUserAnalyticsThrowsWhenUsernameInvalid() {
        assertThatThrownBy(() -> analyticsService.getUserAnalytics(null))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Username must not be empty");

        assertThatThrownBy(() -> analyticsService.getUserAnalytics("   "))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Username must not be empty");
    }

    @Test
    void getUserAnalyticsThrowsWhenUserNotFound() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> analyticsService.getUserAnalytics("unknown"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("User not found: unknown");
    }

    @Test
    void defaultConstructorInstantiatesProperly() {
        AnalyticsService defaultService = new AnalyticsService(
                userRepository,
                videoRepository,
                videoViewRepository,
                commentRepository
        );
        assertThat(defaultService).isNotNull();
    }
}
