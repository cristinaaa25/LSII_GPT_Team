package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.Playlist;
import com.tecnocampus.LS2.protube_back.domain.PlaylistVideo;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.dto.PlaylistDetailDto;
import com.tecnocampus.LS2.protube_back.dto.PlaylistSummaryDto;
import com.tecnocampus.LS2.protube_back.dto.PlaylistVideoDto;
import com.tecnocampus.LS2.protube_back.exception.ConflictException;
import com.tecnocampus.LS2.protube_back.exception.ForbiddenException;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.PlaylistRepository;
import com.tecnocampus.LS2.protube_back.repository.PlaylistVideoRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlaylistServiceTest {

    @Mock
    PlaylistRepository playlistRepository;

    @Mock
    PlaylistVideoRepository playlistVideoRepository;

    @Mock
    UserRepository userRepository;

    @Mock
    VideoRepository videoRepository;

    PlaylistService playlistService;

    private User alice;
    private User bob;
    private Video video;
    private Playlist watchLater;
    private Playlist customList;

    @BeforeEach
    void setUp() {
        playlistService = new PlaylistService(playlistRepository, playlistVideoRepository, userRepository, videoRepository);
        alice = new User("alice", "alice@example.com", "pass");
        alice.setId(1L);
        bob = new User("bob", "bob@example.com", "pass");
        bob.setId(2L);
        video = new Video("Demo", "demo.mp4", alice);
        video.setId(10L);

        watchLater = new Playlist(alice, PlaylistService.WATCH_LATER_NAME);
        watchLater.setId(100L);
        customList = new Playlist(alice, "Favorites");
        customList.setId(101L);
    }

    @Test
    void getMyPlaylistsCreatesWatchLaterOnFirstUseAndReturnsItFirst() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(playlistRepository.findByOwnerIdAndName(1L, PlaylistService.WATCH_LATER_NAME)).thenReturn(Optional.empty());
        when(playlistRepository.saveAndFlush(any(Playlist.class))).thenReturn(watchLater);
        when(playlistRepository.findByOwnerIdOrderByCreatedAtAscIdAsc(1L))
                .thenReturn(List.of(customList, watchLater));
        when(playlistVideoRepository.countVideosByPlaylistIds(List.of(101L, 100L)))
                .thenReturn(Collections.singletonList(new Object[]{101L, 3L}));
        when(playlistVideoRepository.findPlaylistIdsContainingVideo(1L, 10L)).thenReturn(List.of(100L));

        List<PlaylistSummaryDto> result = playlistService.getMyPlaylists("alice", 10L);

        verify(playlistRepository).saveAndFlush(any(Playlist.class));
        assertThat(result).hasSize(2);
        assertThat(result.get(0).name()).isEqualTo("Watch later");
        assertThat(result.get(0).watchLater()).isTrue();
        assertThat(result.get(0).videoCount()).isZero();
        assertThat(result.get(0).containsVideo()).isTrue();
        assertThat(result.get(1).name()).isEqualTo("Favorites");
        assertThat(result.get(1).watchLater()).isFalse();
        assertThat(result.get(1).videoCount()).isEqualTo(3L);
        assertThat(result.get(1).containsVideo()).isFalse();
    }

    @Test
    void getMyPlaylistsDoesNotRecreateWatchLaterWhenAlreadyPresent() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(playlistRepository.findByOwnerIdAndName(1L, PlaylistService.WATCH_LATER_NAME))
                .thenReturn(Optional.of(watchLater));
        when(playlistRepository.findByOwnerIdOrderByCreatedAtAscIdAsc(1L)).thenReturn(List.of(watchLater));
        when(playlistVideoRepository.countVideosByPlaylistIds(List.of(100L))).thenReturn(List.of());

        List<PlaylistSummaryDto> result = playlistService.getMyPlaylists("alice", null);

        verify(playlistRepository, never()).saveAndFlush(any());
        assertThat(result).hasSize(1);
        assertThat(result.get(0).containsVideo()).isFalse();
    }

    @Test
    void createPlaylistValidatesNameAndRejectsDuplicatesAndReservedName() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        assertThatThrownBy(() -> playlistService.createPlaylist("alice", "   "))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> playlistService.createPlaylist("alice", null))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> playlistService.createPlaylist("alice", "a".repeat(101)))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> playlistService.createPlaylist("alice", "watch later"))
                .isInstanceOf(InvalidRequestException.class);

        when(playlistRepository.existsByOwnerIdAndName(1L, "Favorites")).thenReturn(true);
        assertThatThrownBy(() -> playlistService.createPlaylist("alice", " Favorites "))
                .isInstanceOf(ConflictException.class);

        when(playlistRepository.existsByOwnerIdAndName(1L, "Study")).thenReturn(false);
        Playlist study = new Playlist(alice, "Study");
        study.setId(102L);
        when(playlistRepository.saveAndFlush(any(Playlist.class))).thenReturn(study);

        PlaylistSummaryDto created = playlistService.createPlaylist("alice", "  Study  ");
        assertThat(created.id()).isEqualTo(102L);
        assertThat(created.name()).isEqualTo("Study");
        assertThat(created.watchLater()).isFalse();
    }

    @Test
    void getPlaylistEnforcesOwnershipAndNotFound() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));
        when(playlistRepository.findById(999L)).thenReturn(Optional.empty());
        when(playlistRepository.findById(101L)).thenReturn(Optional.of(customList));

        assertThatThrownBy(() -> playlistService.getPlaylist("alice", 999L))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> playlistService.getPlaylist("bob", 101L))
                .isInstanceOf(ForbiddenException.class);

        var videoDto = new PlaylistVideoDto(10L, "Demo", "alice", 12.0, 5L, "t.webp",
                Instant.parse("2026-11-25T10:00:00Z"));
        when(playlistVideoRepository.findVideosInPlaylist(101L)).thenReturn(List.of(videoDto));

        PlaylistDetailDto detail = playlistService.getPlaylist("alice", 101L);
        assertThat(detail.name()).isEqualTo("Favorites");
        assertThat(detail.videos()).containsExactly(videoDto);
    }

    @Test
    void renameAndDeleteProtectWatchLaterAndEnforceOwnership() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));
        when(playlistRepository.findById(100L)).thenReturn(Optional.of(watchLater));
        when(playlistRepository.findById(101L)).thenReturn(Optional.of(customList));

        assertThatThrownBy(() -> playlistService.renamePlaylist("bob", 100L, "Hacked"))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> playlistService.renamePlaylist("alice", 100L, "Renamed"))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> playlistService.deletePlaylist("alice", 100L))
                .isInstanceOf(InvalidRequestException.class);

        when(playlistRepository.existsByOwnerIdAndName(1L, "Existing")).thenReturn(true);
        assertThatThrownBy(() -> playlistService.renamePlaylist("alice", 101L, "Existing"))
                .isInstanceOf(ConflictException.class);

        when(playlistRepository.existsByOwnerIdAndName(1L, "Renamed")).thenReturn(false);
        when(playlistRepository.saveAndFlush(customList)).thenReturn(customList);
        when(playlistVideoRepository.countByPlaylistId(101L)).thenReturn(2L);

        PlaylistSummaryDto renamed = playlistService.renamePlaylist("alice", 101L, " Renamed ");
        assertThat(renamed.name()).isEqualTo("Renamed");
        assertThat(renamed.videoCount()).isEqualTo(2L);

        playlistService.deletePlaylist("alice", 101L);
        verify(playlistRepository).delete(customList);
    }

    @Test
    void addAndRemoveVideoAreIdempotentAndValidateEntities() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(playlistRepository.findById(101L)).thenReturn(Optional.of(customList));
        when(videoRepository.findById(10L)).thenReturn(Optional.of(video));
        when(videoRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playlistService.addVideo("alice", 101L, 404L))
                .isInstanceOf(NotFoundException.class);

        // First add saves, second add does not save again
        when(playlistVideoRepository.existsByPlaylistIdAndVideoId(101L, 10L)).thenReturn(false, true);
        when(playlistVideoRepository.countByPlaylistId(101L)).thenReturn(1L);

        PlaylistSummaryDto firstAdd = playlistService.addVideo("alice", 101L, 10L);
        PlaylistSummaryDto secondAdd = playlistService.addVideo("alice", 101L, 10L);
        verify(playlistVideoRepository).saveAndFlush(any(PlaylistVideo.class));
        assertThat(firstAdd.containsVideo()).isTrue();
        assertThat(secondAdd.videoCount()).isEqualTo(1L);

        when(playlistVideoRepository.countByPlaylistId(101L)).thenReturn(0L);
        PlaylistSummaryDto removed = playlistService.removeVideo("alice", 101L, 10L);
        verify(playlistVideoRepository).deleteByPlaylistIdAndVideoId(101L, 10L);
        assertThat(removed.containsVideo()).isFalse();
        assertThat(removed.videoCount()).isZero();
    }

    @Test
    void requireUserRejectsBlankOrMissingUser() {
        assertThatThrownBy(() -> playlistService.getMyPlaylists(null, null))
                .isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> playlistService.getMyPlaylists("   ", null))
                .isInstanceOf(BadCredentialsException.class);
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> playlistService.getMyPlaylists("ghost", null))
                .isInstanceOf(BadCredentialsException.class);
    }
}
