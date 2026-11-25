package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.PlaylistDetailDto;
import com.tecnocampus.LS2.protube_back.dto.PlaylistRequestDto;
import com.tecnocampus.LS2.protube_back.dto.PlaylistSummaryDto;
import com.tecnocampus.LS2.protube_back.services.PlaylistService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/playlists")
public class PlaylistController {

    private final PlaylistService playlistService;

    public PlaylistController(PlaylistService playlistService) {
        this.playlistService = playlistService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlaylistDetailDto> getPlaylist(@PathVariable("id") Long id, Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(playlistService.getPlaylist(principal.getName(), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlaylistSummaryDto> renamePlaylist(
            @PathVariable("id") Long id,
            @Valid @RequestBody PlaylistRequestDto request,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(playlistService.renamePlaylist(principal.getName(), id, request.name()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlaylist(@PathVariable("id") Long id, Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        playlistService.deletePlaylist(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }

    /** Idempotent: adding a video already in the playlist keeps a single entry. */
    @PutMapping("/{id}/videos/{videoId}")
    public ResponseEntity<PlaylistSummaryDto> addVideo(
            @PathVariable("id") Long id,
            @PathVariable("videoId") Long videoId,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(playlistService.addVideo(principal.getName(), id, videoId));
    }

    /** Idempotent: removing a video not in the playlist is not an error. */
    @DeleteMapping("/{id}/videos/{videoId}")
    public ResponseEntity<PlaylistSummaryDto> removeVideo(
            @PathVariable("id") Long id,
            @PathVariable("videoId") Long videoId,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(playlistService.removeVideo(principal.getName(), id, videoId));
    }
}
