package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.TestImages;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.time.Instant;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Public profile videos (pagination, no login) and avatar upload (only the "avatar" part, real image bytes). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserProfileIntegrationTest {

    @TempDir
    static Path tempDir;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("pro_tube.store.dir", () -> tempDir.toAbsolutePath().toString() + "/");
    }

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VideoRepository videoRepository;

    @Autowired
    JwtService jwtService;

    private String token;

    @BeforeEach
    void setUp() {
        User owner = userRepository.save(new User("profile_owner", "profile_owner@example.com", "pass123"));
        token = jwtService.generateToken(owner);
        for (int i = 1; i <= 3; i++) {
            Video video = new Video("Profile video " + i, "/media/p" + i + ".mp4", owner);
            video.setCreatedAt(Instant.parse("2026-11-0" + i + "T10:00:00Z"));
            videoRepository.save(video);
        }
    }

    @Test
    void publicVideosArePagedNewestFirstWithoutLogin() throws Exception {
        mockMvc.perform(get("/api/users/profile_owner/videos").param("page", "0").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title", contains("Profile video 3", "Profile video 2")))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.last").value(false));

        mockMvc.perform(get("/api/users/profile_owner/videos").param("page", "1").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title", contains("Profile video 1")))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void publicVideosUseDefaultPageSize12() throws Exception {
        mockMvc.perform(get("/api/users/profile_owner/videos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(12))
                .andExpect(jsonPath("$.content", hasSize(3)));
    }

    @Test
    void publicVideosOfUnknownUserReturn404() throws Exception {
        mockMvc.perform(get("/api/users/nobody_here/videos"))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicVideosRejectInvalidPaging() throws Exception {
        mockMvc.perform(get("/api/users/profile_owner/videos").param("size", "0"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publicProfileKeepsItsVideosArray() throws Exception {
        mockMvc.perform(get("/api/users/profile_owner"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("profile_owner"))
                .andExpect(jsonPath("$.videos[*].title",
                        contains("Profile video 3", "Profile video 2", "Profile video 1")));
    }

    @Test
    void avatarWithRealPngIsAccepted() throws Exception {
        MockMultipartFile avatar = new MockMultipartFile("avatar", "me.png", "image/png", TestImages.png());

        mockMvc.perform(multipart("/api/users/me/avatar").file(avatar).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl", startsWith("/media/avatars/")));
    }

    @Test
    void fakeImageAvatarIsRejectedWith400() throws Exception {
        // A text file named .png and sent as image/png
        MockMultipartFile fake = new MockMultipartFile("avatar", "fake.png", "image/png", "just some text".getBytes());

        mockMvc.perform(multipart("/api/users/me/avatar").file(fake).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void avatarSentAsPartFileIsRejectedWith400() throws Exception {
        MockMultipartFile wrongPart = new MockMultipartFile("file", "me.png", "image/png", TestImages.png());

        mockMvc.perform(multipart("/api/users/me/avatar").file(wrongPart).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }
}
