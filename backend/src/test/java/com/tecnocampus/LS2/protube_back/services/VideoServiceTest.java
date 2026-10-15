package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.dto.VideoSummaryDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
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

import java.util.List;

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

    @InjectMocks
    VideoService videoService;

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
}
