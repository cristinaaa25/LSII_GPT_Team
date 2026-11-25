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
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Private playlists and the built-in "Watch later" list.
 * <p>
 * "Watch later" is created on first use when listing playlists and cannot be renamed or deleted.
 * Adding and removing videos are idempotent.
 */
@Service
@Transactional
public class PlaylistService {

    public static final String WATCH_LATER_NAME = "Watch later";
    public static final int MAX_NAME_LENGTH = 100;

    private final PlaylistRepository playlistRepository;
    private final PlaylistVideoRepository playlistVideoRepository;
    private final UserRepository userRepository;
    private final VideoRepository videoRepository;

    public PlaylistService(PlaylistRepository playlistRepository,
                           PlaylistVideoRepository playlistVideoRepository,
                           UserRepository userRepository,
                           VideoRepository videoRepository) {
        this.playlistRepository = playlistRepository;
        this.playlistVideoRepository = playlistVideoRepository;
        this.userRepository = userRepository;
        this.videoRepository = videoRepository;
    }

    /**
     * Lists the user's playlists with "Watch later" first (creating it on first use).
     * When {@code videoId} is provided, {@code containsVideo} indicates membership for each list.
     */
    public List<PlaylistSummaryDto> getMyPlaylists(String username, Long videoId) {
        User owner = requireUser(username);
        if (playlistRepository.findByOwnerIdAndName(owner.getId(), WATCH_LATER_NAME).isEmpty()) {
            playlistRepository.saveAndFlush(new Playlist(owner, WATCH_LATER_NAME));
        }

        List<Playlist> all = playlistRepository.findByOwnerIdOrderByCreatedAtAscIdAsc(owner.getId());
        List<Long> playlistIds = all.stream().map(Playlist::getId).toList();

        Map<Long, Long> counts = new HashMap<>();
        if (!playlistIds.isEmpty()) {
            for (Object[] row : playlistVideoRepository.countVideosByPlaylistIds(playlistIds)) {
                counts.put((Long) row[0], (Long) row[1]);
            }
        }

        Set<Long> containingIds = videoId != null
                ? new HashSet<>(playlistVideoRepository.findPlaylistIdsContainingVideo(owner.getId(), videoId))
                : Set.of();

        List<PlaylistSummaryDto> ordered = new ArrayList<>(all.size());
        for (Playlist playlist : all) {
            if (isWatchLater(playlist)) {
                ordered.add(toSummary(playlist, counts.getOrDefault(playlist.getId(), 0L),
                        containingIds.contains(playlist.getId())));
            }
        }
        for (Playlist playlist : all) {
            if (!isWatchLater(playlist)) {
                ordered.add(toSummary(playlist, counts.getOrDefault(playlist.getId(), 0L),
                        containingIds.contains(playlist.getId())));
            }
        }
        return ordered;
    }

    public PlaylistSummaryDto createPlaylist(String username, String rawName) {
        User owner = requireUser(username);
        String name = validatePlaylistName(rawName);
        if (playlistRepository.existsByOwnerIdAndName(owner.getId(), name)) {
            throw new ConflictException("A playlist named \"" + name + "\" already exists");
        }
        Playlist created = playlistRepository.saveAndFlush(new Playlist(owner, name));
        return toSummary(created, 0L, false);
    }

    @Transactional(readOnly = true)
    public PlaylistDetailDto getPlaylist(String username, Long playlistId) {
        User owner = requireUser(username);
        Playlist playlist = requireOwnedPlaylist(playlistId, owner);
        List<PlaylistVideoDto> videos = playlistVideoRepository.findVideosInPlaylist(playlist.getId());
        return new PlaylistDetailDto(playlist.getId(), playlist.getName(), isWatchLater(playlist),
                playlist.getCreatedAt(), videos);
    }

    public PlaylistSummaryDto renamePlaylist(String username, Long playlistId, String rawName) {
        User owner = requireUser(username);
        Playlist playlist = requireOwnedPlaylist(playlistId, owner);
        if (isWatchLater(playlist)) {
            throw new InvalidRequestException("Watch later playlist cannot be renamed");
        }
        String name = validatePlaylistName(rawName);
        if (!playlist.getName().equals(name) && playlistRepository.existsByOwnerIdAndName(owner.getId(), name)) {
            throw new ConflictException("A playlist named \"" + name + "\" already exists");
        }
        playlist.setName(name);
        Playlist saved = playlistRepository.saveAndFlush(playlist);
        long count = playlistVideoRepository.countByPlaylistId(saved.getId());
        return toSummary(saved, count, false);
    }

    public void deletePlaylist(String username, Long playlistId) {
        User owner = requireUser(username);
        Playlist playlist = requireOwnedPlaylist(playlistId, owner);
        if (isWatchLater(playlist)) {
            throw new InvalidRequestException("Watch later playlist cannot be deleted");
        }
        playlistRepository.delete(playlist);
    }

    public PlaylistSummaryDto addVideo(String username, Long playlistId, Long videoId) {
        User owner = requireUser(username);
        Playlist playlist = requireOwnedPlaylist(playlistId, owner);
        Video video = requireVideo(videoId);
        if (!playlistVideoRepository.existsByPlaylistIdAndVideoId(playlist.getId(), video.getId())) {
            playlistVideoRepository.saveAndFlush(new PlaylistVideo(playlist, video));
        }
        long count = playlistVideoRepository.countByPlaylistId(playlist.getId());
        return toSummary(playlist, count, true);
    }

    public PlaylistSummaryDto removeVideo(String username, Long playlistId, Long videoId) {
        User owner = requireUser(username);
        Playlist playlist = requireOwnedPlaylist(playlistId, owner);
        Video video = requireVideo(videoId);
        playlistVideoRepository.deleteByPlaylistIdAndVideoId(playlist.getId(), video.getId());
        long count = playlistVideoRepository.countByPlaylistId(playlist.getId());
        return toSummary(playlist, count, false);
    }

    private static boolean isWatchLater(Playlist playlist) {
        return WATCH_LATER_NAME.equals(playlist.getName());
    }

    private static PlaylistSummaryDto toSummary(Playlist playlist, long videoCount, boolean containsVideo) {
        return new PlaylistSummaryDto(
                playlist.getId(),
                playlist.getName(),
                isWatchLater(playlist),
                videoCount,
                containsVideo,
                playlist.getCreatedAt()
        );
    }

    private static String validatePlaylistName(String rawName) {
        if (rawName == null || rawName.isBlank()) {
            throw new InvalidRequestException("Playlist name is required");
        }
        String trimmed = rawName.trim();
        if (trimmed.length() > MAX_NAME_LENGTH) {
            throw new InvalidRequestException("Playlist name must be at most " + MAX_NAME_LENGTH + " characters");
        }
        if (WATCH_LATER_NAME.equalsIgnoreCase(trimmed)) {
            throw new InvalidRequestException("\"Watch later\" is a reserved playlist name");
        }
        return trimmed;
    }

    private User requireUser(String username) {
        if (username == null || username.isBlank()) {
            throw new BadCredentialsException("Authentication required");
        }
        return userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new BadCredentialsException("Authentication required"));
    }

    private Playlist requireOwnedPlaylist(Long playlistId, User owner) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new NotFoundException("Playlist not found: " + playlistId));
        if (!playlist.getOwner().getId().equals(owner.getId())) {
            throw new ForbiddenException("You do not have access to this playlist");
        }
        return playlist;
    }

    private Video requireVideo(Long videoId) {
        return videoRepository.findById(videoId)
                .orElseThrow(() -> new NotFoundException("Video not found: " + videoId));
    }
}
