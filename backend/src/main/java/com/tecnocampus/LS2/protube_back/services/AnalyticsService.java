package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.domain.VideoView;
import com.tecnocampus.LS2.protube_back.dto.AnalyticsTotalsDto;
import com.tecnocampus.LS2.protube_back.dto.DailyViewsDto;
import com.tecnocampus.LS2.protube_back.dto.UserAnalyticsDto;
import com.tecnocampus.LS2.protube_back.dto.VideoAnalyticsDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoViewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {

    private final UserRepository userRepository;
    private final VideoRepository videoRepository;
    private final VideoViewRepository videoViewRepository;
    private final CommentRepository commentRepository;
    private final Clock clock;

    @Autowired
    public AnalyticsService(
            UserRepository userRepository,
            VideoRepository videoRepository,
            VideoViewRepository videoViewRepository,
            CommentRepository commentRepository) {
        this(userRepository, videoRepository, videoViewRepository, commentRepository, Clock.systemUTC());
    }

    public AnalyticsService(
            UserRepository userRepository,
            VideoRepository videoRepository,
            VideoViewRepository videoViewRepository,
            CommentRepository commentRepository,
            Clock clock) {
        this.userRepository = userRepository;
        this.videoRepository = videoRepository;
        this.videoViewRepository = videoViewRepository;
        this.commentRepository = commentRepository;
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    @Transactional(readOnly = true)
    public UserAnalyticsDto getUserAnalytics(String username) {
        if (username == null || username.isBlank()) {
            throw new InvalidRequestException("Username must not be empty");
        }
        User user = userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new NotFoundException("User not found: " + username.trim()));

        LocalDate today = LocalDate.now(clock);
        List<Video> videos = videoRepository.findByUploaderIdOrderByCreatedAtDesc(user.getId());

        if (videos.isEmpty()) {
            return new UserAnalyticsDto(
                    new AnalyticsTotalsDto(0, 0, 0, 0),
                    List.of(),
                    generateEmptyDailyViews(today, 30)
            );
        }

        List<VideoAnalyticsDto> videoList = videos.stream().map(v -> {
            long comments = commentRepository.countByVideoId(v.getId());
            long views = v.getViewCount() != null ? v.getViewCount() : 0L;
            long likes = v.getLikeCount() != null ? v.getLikeCount() : 0L;
            return new VideoAnalyticsDto(
                    v.getId(),
                    v.getTitle(),
                    v.getThumbnailUrl(),
                    v.getCreatedAt(),
                    v.getDuration(),
                    views,
                    likes,
                    comments
            );
        }).toList();

        long totalVideos = videoList.size();
        long totalViews = videoList.stream().mapToLong(VideoAnalyticsDto::views).sum();
        long totalLikes = videoList.stream().mapToLong(VideoAnalyticsDto::likes).sum();
        long totalComments = videoList.stream().mapToLong(VideoAnalyticsDto::comments).sum();

        AnalyticsTotalsDto totals = new AnalyticsTotalsDto(totalVideos, totalViews, totalLikes, totalComments);

        Instant since = today.minusDays(29).atStartOfDay(ZoneOffset.UTC).toInstant();
        List<VideoView> registeredViews = videoViewRepository.findByUploaderIdAndViewedAtAfter(user.getId(), since);

        Map<LocalDate, long[]> dailyCounts = new LinkedHashMap<>(30);
        for (int i = 29; i >= 0; i--) {
            dailyCounts.put(today.minusDays(i), new long[3]);
        }

        for (VideoView view : registeredViews) {
            LocalDate viewDate = view.getViewedAt().atZone(ZoneOffset.UTC).toLocalDate();
            long[] counts = dailyCounts.get(viewDate);
            if (counts != null) {
                counts[0]++; // total views
                if (view.getViewer() != null) {
                    counts[1]++; // authenticated views
                } else {
                    counts[2]++; // anonymous views
                }
            }
        }

        List<DailyViewsDto> viewsPerDay = dailyCounts.entrySet().stream()
                .map(e -> new DailyViewsDto(
                        e.getKey().toString(),
                        e.getValue()[0],
                        e.getValue()[1],
                        e.getValue()[2]
                ))
                .toList();

        return new UserAnalyticsDto(totals, videoList, viewsPerDay);
    }

    private List<DailyViewsDto> generateEmptyDailyViews(LocalDate today, int days) {
        List<DailyViewsDto> result = new ArrayList<>(days);
        for (int i = days - 1; i >= 0; i--) {
            result.add(new DailyViewsDto(today.minusDays(i).toString(), 0, 0, 0));
        }
        return result;
    }
}
