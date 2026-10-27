package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.domain.VideoView;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.dto.VideoDetailDto;
import com.tecnocampus.LS2.protube_back.dto.VideoSummaryDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoViewRepository;
import com.tecnocampus.LS2.protube_back.security.UserPrincipal;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class VideoService {

    public static final int MAX_PAGE_SIZE = 100;

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final VideoRepository videoRepository;
    private final CommentRepository commentRepository;
    private final VideoViewRepository videoViewRepository;
    private final UserRepository userRepository;

    public VideoService(
            VideoRepository videoRepository,
            CommentRepository commentRepository,
            VideoViewRepository videoViewRepository,
            UserRepository userRepository) {
        this.videoRepository = videoRepository;
        this.commentRepository = commentRepository;
        this.videoViewRepository = videoViewRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PageDto<VideoSummaryDto> getVideos(int page, int size) {
        if (page < 0) {
            throw new InvalidRequestException("page must be greater than or equal to 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidRequestException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        return PageDto.from(videoRepository.findAllBy(PageRequest.of(page, size, NEWEST_FIRST))
                .map(VideoService::toSummary));
    }

    @Transactional(readOnly = true)
    public VideoDetailDto getVideo(Long id) {
        if (id == null) {
            throw new InvalidRequestException("Video id must not be null");
        }
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Video not found with id " + id));
        long commentCount = commentRepository.countByVideoId(id);
        return toDetail(video, commentCount);
    }

    @Transactional
    public void registerView(Long id) {
        if (id == null) {
            throw new InvalidRequestException("Video id must not be null");
        }
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Video not found with id " + id));

        User viewer = findCurrentAuthenticatedUser();
        VideoView view = viewer != null ? new VideoView(video, viewer) : new VideoView(video);
        videoViewRepository.save(view);
        video.setViewCount(video.getViewCount() + 1);
        videoRepository.save(video);
    }

    private User findCurrentAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        if (auth.getPrincipal() instanceof UserPrincipal principal) {
            return userRepository.findById(principal.getId()).orElse(null);
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    static VideoSummaryDto toSummary(Video video) {
        return new VideoSummaryDto(
                video.getId(),
                video.getTitle(),
                video.getUploader().getUsername(),
                video.getDuration(),
                video.getViewCount(),
                video.getThumbnailUrl());
    }

    static VideoDetailDto toDetail(Video video, long commentCount) {
        return new VideoDetailDto(
                video.getId(),
                video.getTitle(),
                video.getDescription(),
                video.getTags() != null ? new ArrayList<>(video.getTags()) : List.of(),
                video.getCategories() != null ? new ArrayList<>(video.getCategories()) : List.of(),
                video.getUploader() != null ? video.getUploader().getUsername() : null,
                video.getCreatedAt(),
                video.getViewCount(),
                video.getLikeCount(),
                commentCount,
                video.getVideoUrl(),
                video.getThumbnailUrl());
    }
}
