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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VideoServiceTest {

    @Mock
    VideoRepository videoRepository;

    @Mock
    CommentRepository commentRepository;

    @Mock
    VideoViewRepository videoViewRepository;

    @Mock
    UserRepository userRepository;

    @InjectMocks
    VideoService videoService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getVideosMapsEntitiesToSummaries() {
        User author = new User("channel", "c@example.com", "!");
        Video video = new Video("Cats", "desc", "42.mp4", "42.webp", 30.5, 1920, 1080, author);
        video.setId(7L);
        video.setViewCount(1200L);
        when(videoRepository.findAllBy(any(Pageable.class)))
                .thenAnswer(inv -> new PageImpl<>(List.of(video), inv.getArgument(0), 6));

        PageDto<VideoSummaryDto> result = videoService.getVideos(1, 5);

        assertThat(result.content()).containsExactly(
                new VideoSummaryDto(7L, "Cats", "channel", 30.5, 1200L, "42.webp"));
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.size()).isEqualTo(5);
        assertThat(result.totalElements()).isEqualTo(6);
        assertThat(result.totalPages()).isEqualTo(2);
        assertThat(result.last()).isTrue();
    }

    @Test
    void getVideosSortsNewestFirst() {
        when(videoRepository.findAllBy(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        videoService.getVideos(0, 12);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(videoRepository).findAllBy(captor.capture());
        assertThat(captor.getValue()).isEqualTo(
                PageRequest.of(0, 12, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
    }

    @Test
    void getVideosRejectsNegativePage() {
        assertThatThrownBy(() -> videoService.getVideos(-1, 12))
                .isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(videoRepository);
    }

    @Test
    void getVideosRejectsInvalidSize() {
        assertThatThrownBy(() -> videoService.getVideos(0, 0))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> videoService.getVideos(0, VideoService.MAX_PAGE_SIZE + 1))
                .isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(videoRepository);
    }

    @Test
    void getVideoReturnsVideoDetailDtoWhenFound() {
        User author = new User("alice", "alice@example.com", "password");
        Video video = new Video("Funny cats", "Cute pets", "42.mp4", "42.webp", 12.0, 1920, 1080, author);
        video.setId(42L);
        video.setViewCount(100L);
        video.setLikeCount(20L);
        video.setTags(new ArrayList<>(List.of("cats", "funny")));
        video.setCategories(new ArrayList<>(List.of("Animals")));

        when(videoRepository.findById(42L)).thenReturn(Optional.of(video));
        when(commentRepository.countByVideoId(42L)).thenReturn(5L);

        VideoDetailDto result = videoService.getVideo(42L);

        assertThat(result.id()).isEqualTo(42L);
        assertThat(result.title()).isEqualTo("Funny cats");
        assertThat(result.description()).isEqualTo("Cute pets");
        assertThat(result.author()).isEqualTo("alice");
        assertThat(result.tags()).containsExactly("cats", "funny");
        assertThat(result.categories()).containsExactly("Animals");
        assertThat(result.views()).isEqualTo(100L);
        assertThat(result.likes()).isEqualTo(20L);
        assertThat(result.commentCount()).isEqualTo(5L);
        assertThat(result.videoUrl()).isEqualTo("42.mp4");
        assertThat(result.thumbnailUrl()).isEqualTo("42.webp");
    }

    @Test
    void getVideoThrowsNotFoundExceptionWhenNotFound() {
        when(videoRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> videoService.getVideo(999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void getVideoThrowsInvalidRequestExceptionWhenIdIsNull() {
        assertThatThrownBy(() -> videoService.getVideo(null))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void registerViewIncrementsViewCountAndSavesVideoViewAnonymous() {
        Video video = new Video("Cats", "42.mp4", new User("u", "u@e.com", "p"));
        video.setId(42L);
        video.setViewCount(10L);

        when(videoRepository.findById(42L)).thenReturn(Optional.of(video));

        videoService.registerView(42L);

        assertThat(video.getViewCount()).isEqualTo(11L);
        verify(videoRepository).save(video);

        ArgumentCaptor<VideoView> viewCaptor = ArgumentCaptor.forClass(VideoView.class);
        verify(videoViewRepository).save(viewCaptor.capture());
        assertThat(viewCaptor.getValue().getVideo()).isEqualTo(video);
        assertThat(viewCaptor.getValue().getViewer()).isNull();
    }

    @Test
    void registerViewIncrementsViewCountAndSavesVideoViewWithUser() {
        Video video = new Video("Cats", "42.mp4", new User("u", "u@e.com", "p"));
        video.setId(42L);
        video.setViewCount(10L);

        User viewer = new User("viewerUser", "viewer@e.com", "p");
        viewer.setId(99L);
        UserPrincipal principal = UserPrincipal.fromUser(viewer);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));

        when(videoRepository.findById(42L)).thenReturn(Optional.of(video));
        when(userRepository.findById(99L)).thenReturn(Optional.of(viewer));

        videoService.registerView(42L);

        assertThat(video.getViewCount()).isEqualTo(11L);
        verify(videoRepository).save(video);

        ArgumentCaptor<VideoView> viewCaptor = ArgumentCaptor.forClass(VideoView.class);
        verify(videoViewRepository).save(viewCaptor.capture());
        assertThat(viewCaptor.getValue().getVideo()).isEqualTo(video);
        assertThat(viewCaptor.getValue().getViewer()).isEqualTo(viewer);
    }

    @Test
    void registerViewThrowsNotFoundExceptionWhenNotFound() {
        when(videoRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> videoService.registerView(999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void registerViewThrowsInvalidRequestExceptionWhenIdIsNull() {
        assertThatThrownBy(() -> videoService.registerView(null))
                .isInstanceOf(InvalidRequestException.class);
    }
}
