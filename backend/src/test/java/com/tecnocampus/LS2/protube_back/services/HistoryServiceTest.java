package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.dto.HistoryVideoDto;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoViewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.BadCredentialsException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class HistoryServiceTest {

    private VideoViewRepository videoViewRepository;
    private UserRepository userRepository;
    private HistoryService service;
    private User viewer;

    @BeforeEach
    void setUp() {
        videoViewRepository = mock(VideoViewRepository.class);
        userRepository = mock(UserRepository.class);
        service = new HistoryService(videoViewRepository, userRepository);

        viewer = new User("alice", "alice@example.com", "pass");
        viewer.setId(1L);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(viewer));
    }

    @Test
    void getHistoryReturnsPagedDtosWithUnsortedPageable() {
        var item = new HistoryVideoDto(10L, "Clip", "bob", 30.0, 5L, "10.webp",
                Instant.parse("2026-11-24T12:00:00Z"));
        when(videoViewRepository.findHistoryByViewerId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(item), PageRequest.of(1, 5), 6));

        PageDto<HistoryVideoDto> page = service.getHistory(" alice ", 1, 5);

        assertThat(page.content()).containsExactly(item);
        assertThat(page.page()).isEqualTo(1);
        assertThat(page.size()).isEqualTo(5);
        assertThat(page.totalElements()).isEqualTo(6);
        assertThat(page.last()).isTrue();

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(videoViewRepository).findHistoryByViewerId(eq(1L), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(5);
        assertThat(pageable.getValue().getSort().isUnsorted()).isTrue();
    }

    @Test
    void getHistoryValidatesPagingBeforeTouchingDatabase() {
        assertThatThrownBy(() -> service.getHistory("alice", -1, 12)).isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.getHistory("alice", 0, 0)).isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.getHistory("alice", 0, 101)).isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(userRepository, videoViewRepository);
    }

    @Test
    void missingOrUnknownUserThrows401() {
        assertThatThrownBy(() -> service.getHistory(null, 0, 12)).isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> service.getHistory("  ", 0, 12)).isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> service.getHistory("ghost", 0, 12)).isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> service.clearHistory(null)).isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> service.clearHistory("ghost")).isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(videoViewRepository);
    }

    @Test
    void clearHistoryDetachesViewerFromUserViews() {
        service.clearHistory("alice");
        verify(videoViewRepository).clearViewerByViewerId(1L);
    }
}
