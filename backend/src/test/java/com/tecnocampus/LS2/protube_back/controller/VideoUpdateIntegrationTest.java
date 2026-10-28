package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Ownership rules of PUT /api/videos/{id} through the real JWT filter chain and H2. */
@SpringBootTest(properties = "pro_tube.store.dir=target/test-store/")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class VideoUpdateIntegrationTest {

    private static final String UPDATE = """
            {"title": "Edited title", "description": "Edited description",
             "tags": ["edited", "Edited", " new "], "categories": ["Education"]}
            """;

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VideoRepository videoRepository;

    @Autowired
    JwtService jwtService;

    private User owner;
    private User other;
    private Video video;

    @BeforeEach
    void setUp() {
        owner = userRepository.save(new User("edit_owner", "edit_owner@example.com", "pass123"));
        other = userRepository.save(new User("edit_other", "edit_other@example.com", "pass123"));
        video = new Video("Original title", "Original description", "orig.mp4", "orig.webp", 10.0, 640, 360, owner);
        video.setTags(new ArrayList<>(List.of("original")));
        video.setCategories(new ArrayList<>(List.of("Music")));
        video = videoRepository.save(video);
    }

    @Test
    void ownerCanEditAndChangesAreVisibleOnDetail() throws Exception {
        mockMvc.perform(put("/api/videos/" + video.getId())
                        .header("Authorization", "Bearer " + jwtService.generateToken(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Edited title"))
                .andExpect(jsonPath("$.tags.length()").value(2))
                .andExpect(jsonPath("$.tags[0]").value("edited"))
                .andExpect(jsonPath("$.tags[1]").value("new"));

        mockMvc.perform(get("/api/videos/" + video.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Edited title"))
                .andExpect(jsonPath("$.description").value("Edited description"))
                .andExpect(jsonPath("$.categories[0]").value("Education"))
                .andExpect(jsonPath("$.author").value("edit_owner"));
    }

    @Test
    void anotherUserIsForbiddenAndNothingChanges() throws Exception {
        mockMvc.perform(put("/api/videos/" + video.getId())
                        .header("Authorization", "Bearer " + jwtService.generateToken(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE))
                .andExpect(status().isForbidden());

        Video unchanged = videoRepository.findById(video.getId()).orElseThrow();
        assertThat(unchanged.getTitle()).isEqualTo("Original title");
        assertThat(unchanged.getTags()).containsExactly("original");
    }

    @Test
    void anonymousUserIsUnauthorized() throws Exception {
        mockMvc.perform(put("/api/videos/" + video.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unknownVideoIsNotFound() throws Exception {
        mockMvc.perform(put("/api/videos/999999")
                        .header("Authorization", "Bearer " + jwtService.generateToken(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE))
                .andExpect(status().isNotFound());
    }
}
