package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoViewRepository;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "pro_tube.store.dir=target/test-store/",
        "pro_tube.views.dedup-minutes=30"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VideoViewIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VideoRepository videoRepository;

    @Autowired
    VideoViewRepository videoViewRepository;

    @Autowired
    JwtService jwtService;

    @MockBean
    Clock clock;

    private User uploader;
    private User viewerA;
    private User viewerB;
    private Video video;
    private String tokenA;
    private String tokenB;
    private final Instant baseTime = Instant.parse("2026-11-20T10:00:00Z");

    @BeforeEach
    void setUp() {
        when(clock.instant()).thenReturn(baseTime);
        when(clock.getZone()).thenReturn(ZoneOffset.UTC);

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        uploader = userRepository.save(new User("v_up_" + suffix, "v_up_" + suffix + "@example.com", "pass"));
        viewerA = userRepository.save(new User("v_a_" + suffix, "v_a_" + suffix + "@example.com", "pass"));
        viewerB = userRepository.save(new User("v_b_" + suffix, "v_b_" + suffix + "@example.com", "pass"));
        tokenA = jwtService.generateToken(viewerA);
        tokenB = jwtService.generateToken(viewerB);

        video = new Video("Clip", "Desc", "c.mp4", "c.webp", 10.0, 1920, 1080, uploader);
        video.setViewCount(0L);
        video = videoRepository.save(video);
    }

    @AfterEach
    void tearDown() {
        if (video != null && video.getId() != null) {
            videoViewRepository.deleteAll();
            videoRepository.deleteById(video.getId());
        }
        if (viewerA != null && viewerA.getId() != null) {
            userRepository.deleteById(viewerA.getId());
        }
        if (viewerB != null && viewerB.getId() != null) {
            userRepository.deleteById(viewerB.getId());
        }
        if (uploader != null && uploader.getId() != null) {
            userRepository.deleteById(uploader.getId());
        }
    }

    @Test
    void secondViewInsideWindowDoesNotIncrementViewCountAndKeepsStatus200() throws Exception {
        // First view at baseTime
        when(clock.instant()).thenReturn(baseTime);
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views")
                        .header("Authorization", bearer(tokenA)))
                .andExpect(status().isOk());

        assertThat(videoViewRepository.countByVideoId(video.getId())).isEqualTo(1L);

        // Second view 15 minutes later (inside 30-minute window)
        when(clock.instant()).thenReturn(baseTime.plus(Duration.ofMinutes(15)));
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views")
                        .header("Authorization", bearer(tokenA)))
                .andExpect(status().isOk());

        // View count and VideoView rows are NOT incremented
        assertThat(videoViewRepository.countByVideoId(video.getId())).isEqualTo(1L);
        mockMvc.perform(get("/api/videos/" + video.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.views").value(1));
    }

    @Test
    void secondViewOutsideWindowIncrementsViewCountAndKeepsStatus200() throws Exception {
        // First view at baseTime
        when(clock.instant()).thenReturn(baseTime);
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views")
                        .header("Authorization", bearer(tokenA)))
                .andExpect(status().isOk());

        assertThat(videoViewRepository.countByVideoId(video.getId())).isEqualTo(1L);

        // Second view 31 minutes later (outside 30-minute window)
        when(clock.instant()).thenReturn(baseTime.plus(Duration.ofMinutes(31)));
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views")
                        .header("Authorization", bearer(tokenA)))
                .andExpect(status().isOk());

        assertThat(videoViewRepository.countByVideoId(video.getId())).isEqualTo(2L);
        mockMvc.perform(get("/api/videos/" + video.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.views").value(2));
    }

    @Test
    void differentUsersInsideWindowAreBothCounted() throws Exception {
        // User A views at baseTime
        when(clock.instant()).thenReturn(baseTime);
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views")
                        .header("Authorization", bearer(tokenA)))
                .andExpect(status().isOk());

        // User B views 10 minutes later (inside user A's window)
        when(clock.instant()).thenReturn(baseTime.plus(Duration.ofMinutes(10)));
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views")
                        .header("Authorization", bearer(tokenB)))
                .andExpect(status().isOk());

        assertThat(videoViewRepository.countByVideoId(video.getId())).isEqualTo(2L);
        mockMvc.perform(get("/api/videos/" + video.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.views").value(2));
    }

    @Test
    void anonymousViewsAreAlwaysCountedOnBackend() throws Exception {
        // Anonymous view 1
        when(clock.instant()).thenReturn(baseTime);
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views"))
                .andExpect(status().isOk());

        // Anonymous view 2 five minutes later
        when(clock.instant()).thenReturn(baseTime.plus(Duration.ofMinutes(5)));
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views"))
                .andExpect(status().isOk());

        assertThat(videoViewRepository.countByVideoId(video.getId())).isEqualTo(2L);
        mockMvc.perform(get("/api/videos/" + video.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.views").value(2));
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
