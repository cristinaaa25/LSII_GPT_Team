package com.tecnocampus.LS2.protube_back.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.configuration.SecurityConfig;
import com.tecnocampus.LS2.protube_back.dto.*;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.security.RestAuthenticationEntryPoint;
import com.tecnocampus.LS2.protube_back.services.AnalyticsService;
import com.tecnocampus.LS2.protube_back.services.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
@ActiveProfiles("test")
class UserControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    UserService userService;

    @MockBean
    AnalyticsService analyticsService;

    @Test
    void getPublicProfileReturns200ForUnauthenticatedUser() throws Exception {
        var video = new VideoSummaryDto(1L, "My Video", "alice", 12.0, 10L, "thumb.webp");
        var profile = new UserProfileDto(1L, "alice", "Alice Wonder", "/media/avatars/a.png", "Alice bio", List.of(video));

        when(userService.getPublicProfile("alice")).thenReturn(profile);

        mockMvc.perform(get("/api/users/alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.displayName").value("Alice Wonder"))
                .andExpect(jsonPath("$.avatarUrl").value("/media/avatars/a.png"))
                .andExpect(jsonPath("$.description").value("Alice bio"))
                .andExpect(jsonPath("$.videos[0].title").value("My Video"));
    }

    @Test
    void getPublicProfileReturns404WhenNotFound() throws Exception {
        when(userService.getPublicProfile("unknown")).thenThrow(new NotFoundException("User not found: unknown"));

        mockMvc.perform(get("/api/users/unknown"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "alice")
    void getMeReturns200WhenAuthenticated() throws Exception {
        var userDto = new UserDto(1L, "alice", "alice@example.com", "Alice Wonder", "/media/avatars/a.png", "Bio");
        when(userService.getOwnProfile("alice")).thenReturn(userDto);

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.displayName").value("Alice Wonder"));
    }

    @Test
    void getMeReturns401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "alice")
    void getMyAnalyticsReturns200WhenAuthenticated() throws Exception {
        var totals = new AnalyticsTotalsDto(2, 100, 15, 8);
        var video = new VideoAnalyticsDto(
                10L,
                "Demo Video",
                "/media/thumb.webp",
                Instant.parse("2026-11-01T12:00:00Z"),
                45.5,
                100,
                15,
                8
        );
        var dailyViews = List.of(new DailyViewsDto("2026-11-04", 5, 3, 2));
        var analyticsDto = new UserAnalyticsDto(totals, List.of(video), dailyViews);

        when(analyticsService.getUserAnalytics("alice")).thenReturn(analyticsDto);

        mockMvc.perform(get("/api/users/me/analytics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.videos").value(2))
                .andExpect(jsonPath("$.totals.views").value(100))
                .andExpect(jsonPath("$.totals.likes").value(15))
                .andExpect(jsonPath("$.totals.comments").value(8))
                .andExpect(jsonPath("$.videos[0].id").value(10))
                .andExpect(jsonPath("$.videos[0].title").value("Demo Video"))
                .andExpect(jsonPath("$.videos[0].duration").value(45.5))
                .andExpect(jsonPath("$.videos[0].views").value(100))
                .andExpect(jsonPath("$.videos[0].likes").value(15))
                .andExpect(jsonPath("$.videos[0].comments").value(8))
                .andExpect(jsonPath("$.viewsPerDay[0].date").value("2026-11-04"))
                .andExpect(jsonPath("$.viewsPerDay[0].views").value(5))
                .andExpect(jsonPath("$.viewsPerDay[0].authenticatedViews").value(3))
                .andExpect(jsonPath("$.viewsPerDay[0].anonymousViews").value(2));
    }

    @Test
    void getMyAnalyticsReturns401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/users/me/analytics"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "alice")
    void updateMeReturns200WhenValid() throws Exception {
        var request = new UpdateProfileRequestDto("New Alice", "Updated bio");
        var updated = new UserDto(1L, "alice", "alice@example.com", "New Alice", "/media/avatars/a.png", "Updated bio");

        when(userService.updateOwnProfile(eq("alice"), any(UpdateProfileRequestDto.class))).thenReturn(updated);

        mockMvc.perform(put("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("New Alice"))
                .andExpect(jsonPath("$.description").value("Updated bio"));
    }

    @Test
    void updateMeReturns401WhenUnauthenticated() throws Exception {
        var request = new UpdateProfileRequestDto("New Alice", "Updated bio");

        mockMvc.perform(put("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "alice")
    void updateMeReturns400WhenDisplayNameTooLong() throws Exception {
        String longName = "a".repeat(101);
        var request = new UpdateProfileRequestDto(longName, "Bio");

        mockMvc.perform(put("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "alice")
    void uploadAvatarReturns200WhenValid() throws Exception {
        MockMultipartFile avatar = new MockMultipartFile("avatar", "profile.png", "image/png", "fake-png-content".getBytes());
        var updated = new UserDto(1L, "alice", "alice@example.com", "Alice", "/media/avatars/uuid.png", "Bio");

        when(userService.updateAvatar(eq("alice"), any())).thenReturn(updated);

        mockMvc.perform(multipart("/api/users/me/avatar").file(avatar))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value("/media/avatars/uuid.png"));
    }

    @Test
    void uploadAvatarReturns401WhenUnauthenticated() throws Exception {
        MockMultipartFile avatar = new MockMultipartFile("avatar", "profile.png", "image/png", "fake-png-content".getBytes());

        mockMvc.perform(multipart("/api/users/me/avatar").file(avatar))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "alice")
    void uploadAvatarReturns400WhenInvalid() throws Exception {
        MockMultipartFile badFile = new MockMultipartFile("avatar", "bad.txt", "text/plain", "text".getBytes());
        when(userService.updateAvatar(eq("alice"), any()))
                .thenThrow(new InvalidRequestException("Invalid image format"));

        mockMvc.perform(multipart("/api/users/me/avatar").file(badFile))
                .andExpect(status().isBadRequest());
    }
}
