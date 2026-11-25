package com.tecnocampus.LS2.protube_back.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.domain.Playlist;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.repository.PlaylistRepository;
import com.tecnocampus.LS2.protube_back.repository.PlaylistVideoRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Playlists end to end through HTTP + security + H2 with Flyway migrations. */
@SpringBootTest(properties = "pro_tube.store.dir=target/test-store/")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PlaylistIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VideoRepository videoRepository;

    @Autowired
    PlaylistRepository playlistRepository;

    @Autowired
    PlaylistVideoRepository playlistVideoRepository;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    JwtService jwtService;

    private User alice;
    private User bob;
    private String aliceToken;
    private String bobToken;
    private Video video1;
    private Video video2;

    @BeforeEach
    void setUp() {
        alice = userRepository.save(new User("pl_int_alice", "pl_int_alice@example.com", "pass"));
        bob = userRepository.save(new User("pl_int_bob", "pl_int_bob@example.com", "pass"));
        video1 = videoRepository.save(new Video("First video", "v1.mp4", alice));
        video2 = videoRepository.save(new Video("Second video", "v2.mp4", bob));
        aliceToken = jwtService.generateToken(alice);
        bobToken = jwtService.generateToken(bob);
    }

    @Test
    void watchLaterIsCreatedOnFirstUseOrderedFirstAndProtectedFromRenameOrDelete() throws Exception {
        // Before first use, Watch later does not exist yet
        assertThat(playlistRepository.findByOwnerIdAndName(alice.getId(), "Watch later")).isEmpty();

        // Create a custom list first, then fetch GET /api/users/me/playlists -> Watch later is created and listed first
        mockMvc.perform(post("/api/users/me/playlists")
                        .header("Authorization", bearer(aliceToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Study\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Study"));

        String body = mockMvc.perform(get("/api/users/me/playlists")
                        .header("Authorization", bearer(aliceToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", contains("Watch later", "Study")))
                .andExpect(jsonPath("$[0].watchLater").value(true))
                .andExpect(jsonPath("$[1].watchLater").value(false))
                .andReturn().getResponse().getContentAsString();

        JsonNode arr = objectMapper.readTree(body);
        long watchLaterId = arr.get(0).get("id").asLong();

        // Watch later cannot be renamed, deleted, or duplicated
        mockMvc.perform(put("/api/playlists/" + watchLaterId)
                        .header("Authorization", bearer(aliceToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Renamed\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(delete("/api/playlists/" + watchLaterId)
                        .header("Authorization", bearer(aliceToken)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/users/me/playlists")
                        .header("Authorization", bearer(aliceToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"watch later\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ownershipAndNotFoundAreEnforcedAcrossAllPlaylistEndpoints() throws Exception {
        Playlist aliceList = playlistRepository.saveAndFlush(new Playlist(alice, "Private list"));

        mockMvc.perform(get("/api/playlists/" + aliceList.getId())
                        .header("Authorization", bearer(bobToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/playlists/" + aliceList.getId())
                        .header("Authorization", bearer(bobToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Stolen\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/playlists/" + aliceList.getId())
                        .header("Authorization", bearer(bobToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/playlists/" + aliceList.getId() + "/videos/" + video1.getId())
                        .header("Authorization", bearer(bobToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/playlists/" + aliceList.getId() + "/videos/" + video1.getId())
                        .header("Authorization", bearer(bobToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/playlists/999999")
                        .header("Authorization", bearer(bobToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void addRemoveIsIdempotentAndPlaylistReturnsVideosNewestAddedFirst() throws Exception {
        Playlist list = playlistRepository.saveAndFlush(new Playlist(alice, "Weekend"));

        // Add video1 twice -> idempotent, still 1 entry
        mockMvc.perform(put("/api/playlists/" + list.getId() + "/videos/" + video1.getId())
                        .header("Authorization", bearer(aliceToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoCount").value(1))
                .andExpect(jsonPath("$.containsVideo").value(true));

        mockMvc.perform(put("/api/playlists/" + list.getId() + "/videos/" + video1.getId())
                        .header("Authorization", bearer(aliceToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoCount").value(1));

        // Add video2 with a later added_at so order is deterministic (video2 first, then video1)
        jdbcTemplate.update("UPDATE playlist_videos SET added_at = ? WHERE playlist_id = ? AND video_id = ?",
                Timestamp.from(Instant.parse("2026-11-20T10:00:00Z")), list.getId(), video1.getId());
        jdbcTemplate.update("INSERT INTO playlist_videos (playlist_id, video_id, added_at) VALUES (?, ?, ?)",
                list.getId(), video2.getId(), Timestamp.from(Instant.parse("2026-11-22T10:00:00Z")));

        // GET /api/users/me/playlists?videoId= flags membership
        mockMvc.perform(get("/api/users/me/playlists").param("videoId", String.valueOf(video1.getId()))
                        .header("Authorization", bearer(aliceToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].containsVideo").value(false))
                .andExpect(jsonPath("$[1].containsVideo").value(true));

        // GET /api/playlists/{id} returns videos newest added first
        mockMvc.perform(get("/api/playlists/" + list.getId())
                        .header("Authorization", bearer(aliceToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos[*].title", contains("Second video", "First video")));

        // Remove video1 twice -> idempotent
        mockMvc.perform(delete("/api/playlists/" + list.getId() + "/videos/" + video1.getId())
                        .header("Authorization", bearer(aliceToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoCount").value(1))
                .andExpect(jsonPath("$.containsVideo").value(false));

        mockMvc.perform(delete("/api/playlists/" + list.getId() + "/videos/" + video1.getId())
                        .header("Authorization", bearer(aliceToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoCount").value(1));

        assertThat(playlistVideoRepository.countByPlaylistId(list.getId())).isEqualTo(1L);
    }

    @Test
    void nameValidationAndDuplicateNameConflictsReturn400And409() throws Exception {
        mockMvc.perform(post("/api/users/me/playlists")
                        .header("Authorization", bearer(aliceToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/users/me/playlists")
                        .header("Authorization", bearer(aliceToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + "x".repeat(101) + "\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/users/me/playlists")
                        .header("Authorization", bearer(aliceToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Music\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/users/me/playlists")
                        .header("Authorization", bearer(aliceToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Music\"}"))
                .andExpect(status().isConflict());
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
