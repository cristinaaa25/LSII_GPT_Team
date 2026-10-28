package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.configuration.SecurityConfig;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.dto.VideoDetailDto;
import com.tecnocampus.LS2.protube_back.dto.VideoSummaryDto;
import com.tecnocampus.LS2.protube_back.dto.VideoUpdateRequestDto;
import com.tecnocampus.LS2.protube_back.exception.ForbiddenException;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.services.VideoService;
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
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VideosController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class VideosControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    VideoService videoService;

    @Test
    void getVideosReturnsRequestedPage() throws Exception {
        var video = new VideoSummaryDto(7L, "Cats", "channel", 30.5, 1200L, "42.webp");
        when(videoService.getVideos(1, 5)).thenReturn(new PageDto<>(List.of(video), 1, 5, 6, 2, true));

        mockMvc.perform(get("/api/videos").param("page", "1").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(7))
                .andExpect(jsonPath("$.content[0].title").value("Cats"))
                .andExpect(jsonPath("$.content[0].author").value("channel"))
                .andExpect(jsonPath("$.content[0].duration").value(30.5))
                .andExpect(jsonPath("$.content[0].views").value(1200))
                .andExpect(jsonPath("$.content[0].thumbnail").value("42.webp"))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(5))
                .andExpect(jsonPath("$.totalElements").value(6))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void getVideosUsesDefaultPagination() throws Exception {
        when(videoService.getVideos(0, 12)).thenReturn(new PageDto<>(List.of(), 0, 12, 0, 0, true));

        mockMvc.perform(get("/api/videos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty());

        verify(videoService).getVideos(0, 12);
    }

    @Test
    void getVideosReturnsBadRequestForInvalidPagination() throws Exception {
        when(videoService.getVideos(-1, 12)).thenThrow(new InvalidRequestException("page must be >= 0"));

        mockMvc.perform(get("/api/videos").param("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("page must be >= 0"));
    }

    @Test
    void searchVideosIsPublicAndForwardsQueryAndPagination() throws Exception {
        var video = new VideoSummaryDto(7L, "Cats", "channel", 30.5, 1200L, "42.webp");
        when(videoService.searchVideos("cat", 1, 5)).thenReturn(new PageDto<>(List.of(video), 1, 5, 6, 2, true));

        mockMvc.perform(get("/api/videos/search").param("q", "cat").param("page", "1").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Cats"))
                .andExpect(jsonPath("$.totalElements").value(6));
    }

    @Test
    void searchVideosDefaultsToEmptyQueryAndFirstPage() throws Exception {
        when(videoService.searchVideos("", 0, 12)).thenReturn(new PageDto<>(List.of(), 0, 12, 0, 0, true));

        mockMvc.perform(get("/api/videos/search"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty());

        verify(videoService).searchVideos("", 0, 12);
    }

    @Test
    void getVideosReturnsBadRequestForNonNumericPage() throws Exception {
        mockMvc.perform(get("/api/videos").param("page", "abc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getVideoReturnsVideoDetailDto() throws Exception {
        Instant now = Instant.parse("2026-10-25T10:00:00Z");
        VideoDetailDto detail = new VideoDetailDto(
                42L,
                "Funny cats",
                "Cats playing with yarn",
                List.of("cats", "funny"),
                List.of("Animals"),
                "alice",
                now,
                150L,
                25L,
                3L,
                "42.mp4",
                "42.webp");

        when(videoService.getVideo(42L)).thenReturn(detail);

        mockMvc.perform(get("/api/videos/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.title").value("Funny cats"))
                .andExpect(jsonPath("$.description").value("Cats playing with yarn"))
                .andExpect(jsonPath("$.tags[0]").value("cats"))
                .andExpect(jsonPath("$.tags[1]").value("funny"))
                .andExpect(jsonPath("$.categories[0]").value("Animals"))
                .andExpect(jsonPath("$.author").value("alice"))
                .andExpect(jsonPath("$.uploadDate").value("2026-10-25T10:00:00Z"))
                .andExpect(jsonPath("$.views").value(150))
                .andExpect(jsonPath("$.likes").value(25))
                .andExpect(jsonPath("$.commentCount").value(3))
                .andExpect(jsonPath("$.videoUrl").value("42.mp4"))
                .andExpect(jsonPath("$.thumbnailUrl").value("42.webp"));
    }

    @Test
    void getVideoReturns404WhenNotFound() throws Exception {
        when(videoService.getVideo(999L)).thenThrow(new NotFoundException("Video not found with id 999"));

        mockMvc.perform(get("/api/videos/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Video not found with id 999"));
    }

    @Test
    void registerViewReturnsOk() throws Exception {
        doNothing().when(videoService).registerView(42L);

        mockMvc.perform(post("/api/videos/42/views"))
                .andExpect(status().isOk());

        verify(videoService).registerView(42L);
    }

    @Test
    void registerViewReturns404WhenNotFound() throws Exception {
        doThrow(new NotFoundException("Video not found with id 999")).when(videoService).registerView(999L);

        mockMvc.perform(post("/api/videos/999/views"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Video not found with id 999"));
    }

    @Test
    @WithMockUser(username = "alice")
    void uploadVideoReturnsCreatedWhenAuthenticated() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "clip.mp4", "video/mp4", "sample content".getBytes());
        Instant now = Instant.parse("2026-10-25T10:00:00Z");
        VideoDetailDto created = new VideoDetailDto(
                99L,
                "Uploaded Video",
                "Description of uploaded",
                List.of("tag1"),
                List.of("Gaming"),
                "alice",
                now,
                0L,
                0L,
                0L,
                "uuid.mp4",
                "uuid.webp"
        );

        when(videoService.uploadVideo(any(), eq("Uploaded Video"), eq("Description of uploaded"), any(), any(), any(), eq("alice")))
                .thenReturn(created);

        mockMvc.perform(multipart("/api/videos")
                        .file(file)
                        .param("title", "Uploaded Video")
                        .param("description", "Description of uploaded")
                        .param("tags", "tag1")
                        .param("category", "Gaming"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(99))
                .andExpect(jsonPath("$.title").value("Uploaded Video"))
                .andExpect(jsonPath("$.author").value("alice"))
                .andExpect(jsonPath("$.videoUrl").value("uuid.mp4"))
                .andExpect(jsonPath("$.thumbnailUrl").value("uuid.webp"));
    }

    @Test
    void uploadVideoReturnsUnauthorizedWhenUnauthenticated() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "clip.mp4", "video/mp4", "sample content".getBytes());

        mockMvc.perform(multipart("/api/videos")
                        .file(file)
                        .param("title", "Uploaded Video")
                        .param("description", "Description of uploaded"))
                .andExpect(status().isUnauthorized());
    }

    private static final String VALID_UPDATE = """
            {"title": "New title", "description": "New description",
             "tags": ["cats", "funny"], "categories": ["Pets"]}
            """;

    private static VideoDetailDto updatedVideo() {
        return new VideoDetailDto(42L, "New title", "New description", List.of("cats", "funny"), List.of("Pets"),
                "alice", Instant.parse("2026-10-25T10:00:00Z"), 5L, 1L, 2L, "42.mp4", "42.webp");
    }

    @Test
    @WithMockUser(username = "alice")
    void updateVideoReturnsUpdatedVideoForOwner() throws Exception {
        var expectedRequest = new VideoUpdateRequestDto(
                "New title", "New description", List.of("cats", "funny"), List.of("Pets"));
        when(videoService.updateVideo(42L, expectedRequest, "alice")).thenReturn(updatedVideo());

        mockMvc.perform(put("/api/videos/42").contentType(MediaType.APPLICATION_JSON).content(VALID_UPDATE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.title").value("New title"))
                .andExpect(jsonPath("$.description").value("New description"))
                .andExpect(jsonPath("$.tags[1]").value("funny"))
                .andExpect(jsonPath("$.categories[0]").value("Pets"))
                .andExpect(jsonPath("$.commentCount").value(2));
    }

    @Test
    @WithMockUser(username = "mallory")
    void updateVideoReturnsForbiddenForAnotherUser() throws Exception {
        when(videoService.updateVideo(eq(42L), any(), eq("mallory")))
                .thenThrow(new ForbiddenException("Only the owner can edit this video"));

        mockMvc.perform(put("/api/videos/42").contentType(MediaType.APPLICATION_JSON).content(VALID_UPDATE))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Only the owner can edit this video"));
    }

    @Test
    void updateVideoReturnsUnauthorizedWhenAnonymous() throws Exception {
        mockMvc.perform(put("/api/videos/42").contentType(MediaType.APPLICATION_JSON).content(VALID_UPDATE))
                .andExpect(status().isUnauthorized());

        verify(videoService, never()).updateVideo(any(), any(), any());
    }

    @Test
    @WithMockUser(username = "alice")
    void updateVideoReturnsNotFoundForUnknownVideo() throws Exception {
        when(videoService.updateVideo(eq(999L), any(), eq("alice")))
                .thenThrow(new NotFoundException("Video not found with id 999"));

        mockMvc.perform(put("/api/videos/999").contentType(MediaType.APPLICATION_JSON).content(VALID_UPDATE))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Video not found with id 999"));
    }

    @Test
    @WithMockUser(username = "alice")
    void updateVideoRejectsBlankTitle() throws Exception {
        String body = """
                {"title": "  ", "description": "d", "tags": [], "categories": []}
                """;

        mockMvc.perform(put("/api/videos/42").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Title is required"));

        verify(videoService, never()).updateVideo(any(), any(), any());
    }

    @Test
    @WithMockUser(username = "alice")
    void updateVideoRejectsTooLongTitle() throws Exception {
        String body = """
                {"title": "%s", "description": "d", "tags": [], "categories": []}
                """.formatted("x".repeat(256));

        mockMvc.perform(put("/api/videos/42").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Title must not exceed 255 characters"));
    }

    @Test
    @WithMockUser(username = "alice")
    void updateVideoRejectsMissingDescription() throws Exception {
        String body = """
                {"title": "t", "tags": [], "categories": []}
                """;

        mockMvc.perform(put("/api/videos/42").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Description is required"));
    }

    @Test
    @WithMockUser(username = "alice")
    void updateVideoRejectsBlankTag() throws Exception {
        String body = """
                {"title": "t", "description": "d", "tags": ["ok", " "], "categories": []}
                """;

        mockMvc.perform(put("/api/videos/42").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Tags must not be blank"));
    }

    @Test
    @WithMockUser(username = "alice")
    void updateVideoRejectsTooManyTags() throws Exception {
        String tags = String.join(",", Collections.nCopies(21, "\"t\""));
        String body = """
                {"title": "t", "description": "d", "tags": [%s], "categories": []}
                """.formatted(tags);

        mockMvc.perform(put("/api/videos/42").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A video can have at most 20 tags"));
    }

    @Test
    @WithMockUser(username = "alice")
    void updateVideoRejectsMissingCategories() throws Exception {
        String body = """
                {"title": "t", "description": "d", "tags": []}
                """;

        mockMvc.perform(put("/api/videos/42").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Categories are required (use an empty list for none)"));
    }

    @Test
    @WithMockUser(username = "alice")
    void updateVideoRejectsMalformedJson() throws Exception {
        mockMvc.perform(put("/api/videos/42").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest());

        verify(videoService, never()).updateVideo(any(), any(), any());
    }
}
