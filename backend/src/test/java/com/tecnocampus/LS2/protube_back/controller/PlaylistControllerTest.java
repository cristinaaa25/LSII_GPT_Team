package com.tecnocampus.LS2.protube_back.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.configuration.SecurityConfig;
import com.tecnocampus.LS2.protube_back.dto.PlaylistDetailDto;
import com.tecnocampus.LS2.protube_back.dto.PlaylistRequestDto;
import com.tecnocampus.LS2.protube_back.dto.PlaylistSummaryDto;
import com.tecnocampus.LS2.protube_back.dto.PlaylistVideoDto;
import com.tecnocampus.LS2.protube_back.exception.ForbiddenException;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.security.RestAuthenticationEntryPoint;
import com.tecnocampus.LS2.protube_back.services.PlaylistService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PlaylistController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
@ActiveProfiles("test")
class PlaylistControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    PlaylistService playlistService;

    @Test
    void playlistEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/playlists/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/playlists/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PlaylistRequestDto("Renamed"))))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/playlists/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/playlists/1/videos/10")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/playlists/1/videos/10")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "alice")
    void getRenameAndDeletePlaylistReturnExpectedBodiesAndStatuses() throws Exception {
        var video = new PlaylistVideoDto(10L, "Clip", "alice", 15.0, 2L, "10.webp",
                Instant.parse("2026-11-25T09:00:00Z"));
        var detail = new PlaylistDetailDto(5L, "Favorites", false, Instant.parse("2026-11-20T10:00:00Z"),
                List.of(video));
        var renamed = new PlaylistSummaryDto(5L, "Best", false, 1L, false, Instant.parse("2026-11-20T10:00:00Z"));

        when(playlistService.getPlaylist("alice", 5L)).thenReturn(detail);
        when(playlistService.renamePlaylist("alice", 5L, "Best")).thenReturn(renamed);

        mockMvc.perform(get("/api/playlists/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Favorites"))
                .andExpect(jsonPath("$.watchLater").value(false))
                .andExpect(jsonPath("$.videos[0].id").value(10))
                .andExpect(jsonPath("$.videos[0].addedAt").value("2026-11-25T09:00:00Z"));

        mockMvc.perform(put("/api/playlists/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new PlaylistRequestDto("Best"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Best"));

        mockMvc.perform(delete("/api/playlists/5"))
                .andExpect(status().isNoContent());
        verify(playlistService).deletePlaylist("alice", 5L);
    }

    @Test
    @WithMockUser(username = "alice")
    void addAndRemoveVideoReturnUpdatedSummary() throws Exception {
        var added = new PlaylistSummaryDto(5L, "Watch later", true, 1L, true, Instant.parse("2026-11-20T10:00:00Z"));
        var removed = new PlaylistSummaryDto(5L, "Watch later", true, 0L, false, Instant.parse("2026-11-20T10:00:00Z"));

        when(playlistService.addVideo("alice", 5L, 10L)).thenReturn(added);
        when(playlistService.removeVideo("alice", 5L, 10L)).thenReturn(removed);

        mockMvc.perform(put("/api/playlists/5/videos/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.containsVideo").value(true))
                .andExpect(jsonPath("$.videoCount").value(1));

        mockMvc.perform(delete("/api/playlists/5/videos/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.containsVideo").value(false))
                .andExpect(jsonPath("$.videoCount").value(0));
    }

    @Test
    @WithMockUser(username = "bob")
    void mapsForbiddenNotFoundAndValidationErrors() throws Exception {
        when(playlistService.getPlaylist("bob", 5L)).thenThrow(new ForbiddenException("Forbidden"));
        when(playlistService.getPlaylist("bob", 999L)).thenThrow(new NotFoundException("Missing"));
        doThrow(new InvalidRequestException("Watch later playlist cannot be deleted"))
                .when(playlistService).deletePlaylist("bob", 1L);

        mockMvc.perform(get("/api/playlists/5")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/playlists/999")).andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/playlists/1")).andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/playlists/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void directControllerCallsThrowBadCredentialsWhenPrincipalNull() {
        PlaylistController controller = new PlaylistController(playlistService);
        assertThatThrownBy(() -> controller.getPlaylist(1L, null)).isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> controller.renamePlaylist(1L, new PlaylistRequestDto("A"), null))
                .isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> controller.deletePlaylist(1L, null)).isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> controller.addVideo(1L, 2L, null)).isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> controller.removeVideo(1L, 2L, null)).isInstanceOf(BadCredentialsException.class);
    }
}
