package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoLikeRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "pro_tube.store.dir=target/test-store/")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VideoLikeIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VideoRepository videoRepository;

    @Autowired
    VideoLikeRepository videoLikeRepository;

    @Autowired
    JwtService jwtService;

    private User uploader;
    private User liker;
    private Video video;
    private String token;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        uploader = userRepository.save(new User("vl_up_" + suffix, "vl_up_" + suffix + "@example.com", "pass"));
        liker = userRepository.save(new User("vl_liker_" + suffix, "vl_liker_" + suffix + "@example.com", "pass"));
        token = jwtService.generateToken(liker);

        video = new Video("Nature Clip", "Beautiful views", "1.mp4", "1.webp", 15.0, 1920, 1080, uploader);
        video.setLikeCount(50L);
        video = videoRepository.save(video);
    }

    @AfterEach
    void tearDown() {
        if (video != null && video.getId() != null) {
            videoLikeRepository.deleteAll();
            videoRepository.deleteById(video.getId());
        }
        if (liker != null && liker.getId() != null) {
            userRepository.deleteById(liker.getId());
        }
        if (uploader != null && uploader.getId() != null) {
            userRepository.deleteById(uploader.getId());
        }
    }

    @Test
    void unauthenticatedRequestsReturn401() throws Exception {
        mockMvc.perform(put("/api/videos/" + video.getId() + "/like"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/videos/" + video.getId() + "/like"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unknownVideoReturns404() throws Exception {
        mockMvc.perform(put("/api/videos/99999/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/videos/99999/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void likeVideoIncrementsCountAndIsIdempotent() throws Exception {
        // First like: increments count to 51
        mockMvc.perform(put("/api/videos/" + video.getId() + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoId").value(video.getId()))
                .andExpect(jsonPath("$.likeCount").value(51))
                .andExpect(jsonPath("$.likedByMe").value(true));

        Video updated = videoRepository.findById(video.getId()).orElseThrow();
        assertThat(updated.getLikeCount()).isEqualTo(51L);
        assertThat(videoLikeRepository.existsByVideoIdAndUserId(video.getId(), liker.getId())).isTrue();

        // Second like (idempotent): count stays 51, no error
        mockMvc.perform(put("/api/videos/" + video.getId() + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoId").value(video.getId()))
                .andExpect(jsonPath("$.likeCount").value(51))
                .andExpect(jsonPath("$.likedByMe").value(true));

        updated = videoRepository.findById(video.getId()).orElseThrow();
        assertThat(updated.getLikeCount()).isEqualTo(51L);
    }

    @Test
    void unlikeVideoDecrementsCountAndIsIdempotent() throws Exception {
        // Like first
        mockMvc.perform(put("/api/videos/" + video.getId() + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // First unlike: decrements count back to 50
        mockMvc.perform(delete("/api/videos/" + video.getId() + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoId").value(video.getId()))
                .andExpect(jsonPath("$.likeCount").value(50))
                .andExpect(jsonPath("$.likedByMe").value(false));

        Video updated = videoRepository.findById(video.getId()).orElseThrow();
        assertThat(updated.getLikeCount()).isEqualTo(50L);
        assertThat(videoLikeRepository.existsByVideoIdAndUserId(video.getId(), liker.getId())).isFalse();

        // Second unlike (idempotent): count remains 50
        mockMvc.perform(delete("/api/videos/" + video.getId() + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoId").value(video.getId()))
                .andExpect(jsonPath("$.likeCount").value(50))
                .andExpect(jsonPath("$.likedByMe").value(false));

        updated = videoRepository.findById(video.getId()).orElseThrow();
        assertThat(updated.getLikeCount()).isEqualTo(50L);
    }

    @Test
    void likeCountNeverDecrementsBelowZero() throws Exception {
        video.setLikeCount(0L);
        video = videoRepository.save(video);

        mockMvc.perform(delete("/api/videos/" + video.getId() + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(0))
                .andExpect(jsonPath("$.likedByMe").value(false));

        Video updated = videoRepository.findById(video.getId()).orElseThrow();
        assertThat(updated.getLikeCount()).isEqualTo(0L);
    }

    @Test
    void getVideoDetailReturnsLikedByMeCorrectly() throws Exception {
        // Anonymous user -> likedByMe: false
        mockMvc.perform(get("/api/videos/" + video.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likedByMe").value(false))
                .andExpect(jsonPath("$.likes").value(50));

        // Liker before liking -> likedByMe: false
        mockMvc.perform(get("/api/videos/" + video.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likedByMe").value(false));

        // Like video
        mockMvc.perform(put("/api/videos/" + video.getId() + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Liker after liking -> likedByMe: true
        mockMvc.perform(get("/api/videos/" + video.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likedByMe").value(true))
                .andExpect(jsonPath("$.likes").value(51));

        // Another user -> likedByMe: false
        User other = userRepository.save(new User("vl_other_" + UUID.randomUUID().toString().substring(0, 8),
                "other_" + UUID.randomUUID() + "@example.com", "pass"));
        try {
            String otherToken = jwtService.generateToken(other);

            mockMvc.perform(get("/api/videos/" + video.getId())
                            .header("Authorization", "Bearer " + otherToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.likedByMe").value(false))
                    .andExpect(jsonPath("$.likes").value(51));
        } finally {
            userRepository.deleteById(other.getId());
        }
    }

    @Test
    void concurrentDuplicateLikesNeverReturn500() throws Exception {
        int threads = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        List<Callable<Integer>> tasks = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            tasks.add(() -> mockMvc.perform(put("/api/videos/" + video.getId() + "/like")
                            .header("Authorization", "Bearer " + token))
                    .andReturn().getResponse().getStatus());
        }

        List<Future<Integer>> results = executor.invokeAll(tasks);
        executor.shutdown();

        for (Future<Integer> result : results) {
            int status = result.get();
            // A concurrent duplicate must not give 500: it gives 200 (or 409)
            assertThat(status).isNotEqualTo(500);
            assertThat(status).isEqualTo(200);
        }

        Video updated = videoRepository.findById(video.getId()).orElseThrow();
        // Like count must have incremented by exactly 1
        assertThat(updated.getLikeCount()).isEqualTo(51L);
        assertThat(videoLikeRepository.countByVideoId(video.getId())).isEqualTo(1L);
    }
}
