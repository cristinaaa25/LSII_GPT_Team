package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.ChannelDto;
import com.tecnocampus.LS2.protube_back.dto.HistoryVideoDto;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.dto.PlaylistRequestDto;
import com.tecnocampus.LS2.protube_back.dto.PlaylistSummaryDto;
import com.tecnocampus.LS2.protube_back.dto.SubscriptionStatusDto;
import com.tecnocampus.LS2.protube_back.dto.UpdateProfileRequestDto;
import com.tecnocampus.LS2.protube_back.dto.UserAnalyticsDto;
import com.tecnocampus.LS2.protube_back.dto.UserDto;
import com.tecnocampus.LS2.protube_back.dto.UserProfileDto;
import com.tecnocampus.LS2.protube_back.dto.VideoSummaryDto;
import com.tecnocampus.LS2.protube_back.services.AnalyticsService;
import com.tecnocampus.LS2.protube_back.services.HistoryService;
import com.tecnocampus.LS2.protube_back.services.PlaylistService;
import com.tecnocampus.LS2.protube_back.services.SubscriptionService;
import com.tecnocampus.LS2.protube_back.services.UserService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final AnalyticsService analyticsService;
    private final SubscriptionService subscriptionService;
    private final HistoryService historyService;
    private final PlaylistService playlistService;

    public UserController(UserService userService, AnalyticsService analyticsService,
                          SubscriptionService subscriptionService, HistoryService historyService,
                          PlaylistService playlistService) {
        this.userService = userService;
        this.analyticsService = analyticsService;
        this.subscriptionService = subscriptionService;
        this.historyService = historyService;
        this.playlistService = playlistService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe(Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(userService.getOwnProfile(principal.getName()));
    }

    @GetMapping("/me/analytics")
    public ResponseEntity<UserAnalyticsDto> getMyAnalytics(Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(analyticsService.getUserAnalytics(principal.getName()));
    }

    @PutMapping("/me")
    public ResponseEntity<UserDto> updateMe(
            @Valid @RequestBody UpdateProfileRequestDto request,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(userService.updateOwnProfile(principal.getName(), request));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDto> uploadAvatar(
            @RequestParam(value = "avatar", required = false) MultipartFile avatar,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(userService.updateAvatar(principal.getName(), avatar));
    }

    /** Channels the current user is subscribed to, most recent subscription first. */
    @GetMapping("/me/subscriptions")
    public ResponseEntity<List<ChannelDto>> getMySubscriptions(Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(subscriptionService.getSubscriptions(principal.getName()));
    }

    /** Videos of the subscribed channels, newest first. */
    @GetMapping("/me/feed")
    public ResponseEntity<PageDto<VideoSummaryDto>> getMyFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(subscriptionService.getFeed(principal.getName(), page, size));
    }

    /** Distinct videos viewed by the current user, most recent view first. */
    @GetMapping("/me/history")
    public ResponseEntity<PageDto<HistoryVideoDto>> getMyHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(historyService.getHistory(principal.getName(), page, size));
    }

    /** Clears the current user's watch history without changing video view counts or analytics. */
    @DeleteMapping("/me/history")
    public ResponseEntity<Void> clearMyHistory(Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        historyService.clearHistory(principal.getName());
        return ResponseEntity.noContent().build();
    }

    /** Current user's playlists ("Watch later" first, created on first use). */
    @GetMapping("/me/playlists")
    public ResponseEntity<List<PlaylistSummaryDto>> getMyPlaylists(
            @RequestParam(value = "videoId", required = false) Long videoId,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(playlistService.getMyPlaylists(principal.getName(), videoId));
    }

    /** Creates a custom private playlist for the current user. */
    @PostMapping("/me/playlists")
    public ResponseEntity<PlaylistSummaryDto> createMyPlaylist(
            @Valid @RequestBody PlaylistRequestDto request,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        PlaylistSummaryDto created = playlistService.createPlaylist(principal.getName(), request.name());
        return ResponseEntity.created(URI.create("/api/playlists/" + created.id())).body(created);
    }

    /** Public; {@code subscribedByMe} is false when the request carries no valid token. */
    @GetMapping("/{username}")
    public ResponseEntity<UserProfileDto> getPublicProfile(@PathVariable("username") String username,
                                                           Principal principal) {
        return ResponseEntity.ok(userService.getPublicProfile(username,
                principal != null ? principal.getName() : null));
    }

    /** Idempotent: subscribing twice keeps one subscription. Unknown user 404, yourself 400. */
    @PutMapping("/{username}/subscription")
    public ResponseEntity<SubscriptionStatusDto> subscribe(@PathVariable("username") String username,
                                                           Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(subscriptionService.subscribe(principal.getName(), username));
    }

    /** Idempotent: unsubscribing when not subscribed is not an error. Unknown user 404, yourself 400. */
    @DeleteMapping("/{username}/subscription")
    public ResponseEntity<SubscriptionStatusDto> unsubscribe(@PathVariable("username") String username,
                                                             Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(subscriptionService.unsubscribe(principal.getName(), username));
    }

    @GetMapping("/{username}/videos")
    public ResponseEntity<PageDto<VideoSummaryDto>> getPublicVideos(
            @PathVariable("username") String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(userService.getPublicVideos(username, page, size));
    }
}
