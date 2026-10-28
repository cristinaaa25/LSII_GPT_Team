package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import com.tecnocampus.LS2.protube_back.services.VideoService;
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

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class VideoUploadIntegrationTest {

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
        User uploader = userRepository.findByUsername("uploader_test")
                .orElseGet(() -> userRepository.save(new User("uploader_test", "uploader@example.com", "pass123")));
        token = jwtService.generateToken(uploader);
    }

    @Test
    void uploadVideoSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "nature.mp4", "video/mp4", "valid mp4 binary stream".getBytes()
        );

        String responseJson = mockMvc.perform(multipart("/api/videos")
                        .file(file)
                        .param("title", "Nature Documentary")
                        .param("description", "A film about wildlife")
                        .param("tags", "wildlife,nature")
                        .param("category", "Documentary")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.title").value("Nature Documentary"))
                .andExpect(jsonPath("$.description").value("A film about wildlife"))
                .andExpect(jsonPath("$.author").value("uploader_test"))
                .andExpect(jsonPath("$.tags[0]").value("wildlife"))
                .andExpect(jsonPath("$.tags[1]").value("nature"))
                .andExpect(jsonPath("$.categories[0]").value("Documentary"))
                .andExpect(jsonPath("$.videoUrl").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        // Check file exists in tempDir (store.dir)
        String videoUrl = com.jayway.jsonpath.JsonPath.read(responseJson, "$.videoUrl");
        Path storedVideo = tempDir.resolve(videoUrl);
        assertThat(Files.exists(storedVideo)).isTrue();
        assertThat(Files.readAllBytes(storedVideo)).isEqualTo("valid mp4 binary stream".getBytes());

        // Check DB row exists
        Number idNum = com.jayway.jsonpath.JsonPath.read(responseJson, "$.id");
        Optional<Video> found = videoRepository.findById(idNum.longValue());
        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Nature Documentary");
        assertThat(found.get().getVideoUrl()).isEqualTo(videoUrl);
    }

    @Test
    void uploadVideoWrongType() throws Exception {
        long initialDbCount = videoRepository.count();
        long initialFileCount;
        try (var stream = Files.list(tempDir)) {
            initialFileCount = stream.count();
        }

        MockMultipartFile file = new MockMultipartFile(
                "file", "notes.txt", "text/plain", "just text".getBytes()
        );

        mockMvc.perform(multipart("/api/videos")
                        .file(file)
                        .param("title", "My Notes")
                        .param("description", "Some text file")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Only video/mp4 files are supported"));

        // No new file in tempDir and no DB row added
        assertThat(videoRepository.count()).isEqualTo(initialDbCount);
        try (var stream = Files.list(tempDir)) {
            assertThat(stream.count()).isEqualTo(initialFileCount);
        }
    }

    @Test
    void uploadVideoTooBig() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "oversized.mp4", "video/mp4", new byte[10]
        ) {
            @Override
            public long getSize() {
                return VideoService.MAX_FILE_SIZE + 100;
            }
        };

        mockMvc.perform(multipart("/api/videos")
                        .file(file)
                        .param("title", "Oversized Video")
                        .param("description", "Too big")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.detail").value("File size exceeds the 100MB limit"));
    }

    @Test
    void uploadVideoUnauthenticated() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "unauth.mp4", "video/mp4", "content".getBytes()
        );

        mockMvc.perform(multipart("/api/videos")
                        .file(file)
                        .param("title", "Unauthenticated Video")
                        .param("description", "Should fail"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void uploadVideoWithThumbnail() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "clip.mp4", "video/mp4", "mp4 stream".getBytes()
        );
        MockMultipartFile thumb = new MockMultipartFile(
                "thumbnail", "cover.png", "image/png", "png image bytes".getBytes()
        );

        String responseJson = mockMvc.perform(multipart("/api/videos")
                        .file(file)
                        .file(thumb)
                        .param("title", "Custom Thumbnail Video")
                        .param("description", "With cover image")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.thumbnailUrl").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String thumbUrl = com.jayway.jsonpath.JsonPath.read(responseJson, "$.thumbnailUrl");
        assertThat(thumbUrl).endsWith(".png");
        Path storedThumb = tempDir.resolve(thumbUrl);
        assertThat(Files.exists(storedThumb)).isTrue();
        assertThat(Files.readAllBytes(storedThumb)).isEqualTo("png image bytes".getBytes());
    }
}
