package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.configuration.SecurityConfig;
import com.tecnocampus.LS2.protube_back.security.RestAuthenticationEntryPoint;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

// The packaged jar serves the React SPA: its files and client-side routes must be public, the API must not
@WebMvcTest(IndexController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.thymeleaf.prefix=classpath:/templates/")
class SpaRoutingSecurityTest {

    @Autowired
    MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = {"/", "/login", "/register", "/upload", "/videos/42"})
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
