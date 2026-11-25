package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.domain.VideoView;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoViewRepository;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Watch history end to end through HTTP + security + H2 with Flyway migrations. */
@SpringBootTest(properties = "pro_tube.store.dir=target/test-store/")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class HistoryIntegrationTest {

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

    @Value("${pro_tube.jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    String jwtSecret;

    private User viewer;
    private User author;
    private User otherViewer;
    private String viewerToken;
    private String otherToken;

    @BeforeEach
    void setUp() {
        viewer = userRepository.save(new User("hist_viewer", "hist_viewer@example.com", "pass"));
        author = userRepository.save(new User("hist_author", "hist_author@example.com", "pass"));
        otherViewer = userRepository.save(new User("hist_other", "hist_other@example.com", "pass"));
        viewerToken = jwtService.generateToken(viewer);
        otherToken = jwtService.generateToken(otherViewer);
    }

    @Test
    void unauthenticatedAndInvalidTokenRequestsReturn401() throws Exception {
        mockMvc.perform(get("/api/users/me/history")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/users/me/history")).andExpect(status().isUnauthorized());

        String expired = new JwtService(jwtSecret, -60_000).generateToken(viewer);
        for (String bad : new String[]{expired, "not-a-jwt"}) {
            mockMvc.perform(get("/api/users/me/history").header("Authorization", bearer(bad)))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(delete("/api/users/me/history").header("Authorization", bearer(bad)))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void historyDeduplicatesVideosAndOrdersMostRecentViewFirst() throws Exception {
        Video videoA = saveVideo("Video A", author);
        Video videoB = saveVideo("Video B", author);
        Video videoC = saveVideo("Video C", viewer);

        // Watched A first, then B, then C, then A again -> expected order: A, C, B
        saveView(videoA, viewer, "2026-11-20T10:00:00Z");
        saveView(videoB, viewer, "2026-11-21T10:00:00Z");
        saveView(videoC, viewer, "2026-11-22T10:00:00Z");
        saveView(videoA, viewer, "2026-11-23T15:30:00Z");

        // Other user and anonymous views must not affect viewer's history
        saveView(videoB, otherViewer, "2026-11-24T10:00:00Z");
        saveView(videoB, null, "2026-11-24T11:00:00Z");

        mockMvc.perform(get("/api/users/me/history").param("page", "0").param("size", "2")
                        .header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title", contains("Video A", "Video C")))
                .andExpect(jsonPath("$.content[0].lastViewedAt").value("2026-11-23T15:30:00Z"))
                .andExpect(jsonPath("$.content[1].lastViewedAt").value("2026-11-22T10:00:00Z"))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.last").value(false));

        mockMvc.perform(get("/api/users/me/history").param("page", "1").param("size", "2")
                        .header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title", contains("Video B")))
                .andExpect(jsonPath("$.content[0].lastViewedAt").value("2026-11-21T10:00:00Z"))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void clearingHistoryKeepsViewCountsAndAnalyticsAndOtherUsersIntact() throws Exception {
        Video video = saveVideo("Analytics Video", author);

        // Register views through the HTTP endpoint so video.viewCount and video_views both reflect real playback
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views").header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views").header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/videos/" + video.getId() + "/views").header("Authorization", bearer(otherToken)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/users/me/history").header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        // Clear viewer's history
        mockMvc.perform(delete("/api/users/me/history").header("Authorization", bearer(viewerToken)))
                .andExpect(status().isNoContent());

        // Viewer's history is now empty
        mockMvc.perform(get("/api/users/me/history").header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", empty()))
                .andExpect(jsonPath("$.totalElements").value(0));

        // Other user's history is untouched
        mockMvc.perform(get("/api/users/me/history").header("Authorization", bearer(otherToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        // Video viewCount, video_views total rows, and author analytics total views are unchanged (3 views)
        assertThat(videoViewRepository.countByVideoId(video.getId())).isEqualTo(3L);
        mockMvc.perform(get("/api/videos/" + video.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.views").value(3));
        mockMvc.perform(get("/api/users/me/analytics").header("Authorization", bearer(jwtService.generateToken(author))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.views").value(3));
    }

    @Test
    void invalidPagingReturns400() throws Exception {
        mockMvc.perform(get("/api/users/me/history").param("page", "-1").header("Authorization", bearer(viewerToken)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/users/me/history").param("size", "0").header("Authorization", bearer(viewerToken)))
                .andExpect(status().isBadRequest());
    }

    private Video saveVideo(String title, User uploader) {
        Video v = new Video(title, "/media/" + title.replace(' ', '_') + ".mp4", uploader);
        v.setThumbnailUrl(title.replace(' ', '_') + ".webp");
        v.setDuration(60.0);
        return videoRepository.save(v);
    }

    private void saveView(Video video, User who, String viewedAt) {
        VideoView view = who != null ? new VideoView(video, who) : new VideoView(video);
        view.setViewedAt(Instant.parse(viewedAt));
        videoViewRepository.save(view);
        video.setViewCount(video.getViewCount() + 1);
        videoRepository.save(video);
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
