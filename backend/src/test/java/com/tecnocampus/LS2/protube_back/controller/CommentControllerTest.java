package com.tecnocampus.LS2.protube_back.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.configuration.SecurityConfig;
import com.tecnocampus.LS2.protube_back.dto.CommentDto;
import com.tecnocampus.LS2.protube_back.dto.CommentLikeDto;
import com.tecnocampus.LS2.protube_back.dto.CommentRequestDto;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.security.RestAuthenticationEntryPoint;
import com.tecnocampus.LS2.protube_back.services.CommentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
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

@WebMvcTest(CommentController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
@ActiveProfiles("test")
class CommentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CommentService commentService;

    @Test
    void getComments_anonymousAllowed_returns200() throws Exception {
        CommentDto comment = new CommentDto(
                1L, 10L, "Hello world", "bob", Instant.now(), 2L, false, null, List.of()
        );
        when(commentService.getComments(10L, 0, 10))
                .thenReturn(new PageDto<>(List.of(comment), 0, 10, 1, 1, true));

        mockMvc.perform(get("/api/videos/10/comments")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].text").value("Hello world"))
                .andExpect(jsonPath("$.content[0].author").value("bob"))
                .andExpect(jsonPath("$.content[0].likeCount").value(2))
                .andExpect(jsonPath("$.content[0].likedByMe").value(false));
    }

    @Test
    void getComments_notFound_returns404() throws Exception {
        when(commentService.getComments(999L, 0, 10))
                .thenThrow(new NotFoundException("Video not found with id 999"));

        mockMvc.perform(get("/api/videos/999/comments"))
                .andExpect(status().isNotFound());
    }

    @Test
    void addComment_unauthenticated_returns401() throws Exception {
        CommentRequestDto body = new CommentRequestDto("My comment");
        mockMvc.perform(post("/api/videos/10/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "bob")
    void addComment_emptyText_returns400() throws Exception {
        CommentRequestDto body = new CommentRequestDto("");
        mockMvc.perform(post("/api/videos/10/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "bob")
    void addComment_authenticatedAndValid_returns201() throws Exception {
        CommentRequestDto body = new CommentRequestDto("Nice video!");
        CommentDto created = new CommentDto(
                100L, 10L, "Nice video!", "bob", Instant.now(), 0L, false, null, List.of()
        );
        when(commentService.addComment(eq(10L), any(CommentRequestDto.class))).thenReturn(created);

        mockMvc.perform(post("/api/videos/10/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.text").value("Nice video!"))
                .andExpect(jsonPath("$.author").value("bob"));
    }

    @Test
    void addReply_unauthenticated_returns401() throws Exception {
        CommentRequestDto body = new CommentRequestDto("Reply text");
        mockMvc.perform(post("/api/comments/1/replies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "bob")
    void addReply_authenticatedAndValid_returns201() throws Exception {
        CommentRequestDto body = new CommentRequestDto("Replying here");
        CommentDto reply = new CommentDto(
                101L, 10L, "Replying here", "bob", Instant.now(), 0L, false, 1L, List.of()
        );
        when(commentService.addReply(eq(1L), any(CommentRequestDto.class))).thenReturn(reply);

        mockMvc.perform(post("/api/comments/1/replies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(101))
                .andExpect(jsonPath("$.parentId").value(1))
                .andExpect(jsonPath("$.text").value("Replying here"));
    }

    @Test
    @WithMockUser(username = "bob")
    void addReply_nestedBeyondOneLevel_returns400() throws Exception {
        CommentRequestDto body = new CommentRequestDto("Replying to reply");
        when(commentService.addReply(eq(101L), any(CommentRequestDto.class)))
                .thenThrow(new InvalidRequestException("Replies cannot be nested beyond one level"));

        mockMvc.perform(post("/api/comments/101/replies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Replies cannot be nested beyond one level"));
    }

    @Test
    void likeComment_unauthenticated_returns401() throws Exception {
        mockMvc.perform(put("/api/comments/1/like"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "bob")
    void likeComment_authenticated_returns200() throws Exception {
        when(commentService.likeComment(1L)).thenReturn(new CommentLikeDto(1L, 5L, true));

        mockMvc.perform(put("/api/comments/1/like"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commentId").value(1))
                .andExpect(jsonPath("$.likeCount").value(5))
                .andExpect(jsonPath("$.likedByMe").value(true));
    }

    @Test
    void unlikeComment_unauthenticated_returns401() throws Exception {
        mockMvc.perform(delete("/api/comments/1/like"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "bob")
    void unlikeComment_authenticated_returns200() throws Exception {
        when(commentService.unlikeComment(1L)).thenReturn(new CommentLikeDto(1L, 4L, false));

        mockMvc.perform(delete("/api/comments/1/like"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commentId").value(1))
                .andExpect(jsonPath("$.likeCount").value(4))
                .andExpect(jsonPath("$.likedByMe").value(false));
    }
}
