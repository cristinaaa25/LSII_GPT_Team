package com.tecnocampus.LS2.protube_back.controller;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

// The packaged jar serves the React SPA: its files and client-side routes must be public, the API must not.
// Swagger UI and the OpenAPI schema are explicitly excluded from SPA forwarding and public by design.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.thymeleaf.prefix=classpath:/templates/")
class SpaRoutingSecurityTest {

    @Autowired
    MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = {"/", "/login", "/register", "/upload", "/videos/42", "/auth/callback"})
    void clientSideRoutesServeIndexWithoutAuthentication(String path) throws Exception {
        mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andExpect(view().name("index"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/assets/index-abc123.js", "/assets/index-abc123.css", "/favicon.ico"})
    void staticFilesAreNotBlockedBySecurity(String path) throws Exception {
        // Not present in the test classpath: 404 proves the request got past Spring Security (401 otherwise)
        mockMvc.perform(get(path))
                .andExpect(status().isNotFound());
    }

    @Test
    void openApiSpecIsPublicAndIncludesVideoRoutes() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/api/videos")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/unknown", "/api/auth/me"})
    void apiStillRequiresAuthentication(String path) throws Exception {
        mockMvc.perform(get(path))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/login", "/anything"})
    void nonGetRequestsOutsideApiRequireAuthentication(String path) throws Exception {
        mockMvc.perform(post(path))
                .andExpect(status().isUnauthorized());
    }
}
