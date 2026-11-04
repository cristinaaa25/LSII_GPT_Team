package com.tecnocampus.LS2.protube_back.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.configuration.SecurityConfig;
import com.tecnocampus.LS2.protube_back.dto.AuthResponseDto;
import com.tecnocampus.LS2.protube_back.dto.LoginRequestDto;
import com.tecnocampus.LS2.protube_back.dto.RegisterRequestDto;
import com.tecnocampus.LS2.protube_back.dto.UserDto;
import com.tecnocampus.LS2.protube_back.exception.ConflictException;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.services.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tecnocampus.LS2.protube_back.security.RestAuthenticationEntryPoint;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    AuthService authService;

    @Test
    void registerReturns201WhenValid() throws Exception {
        RegisterRequestDto request = new RegisterRequestDto(
                "alice", "alice@example.com", "password123", "http://avatar", "bio"
        );
        UserDto userDto = new UserDto(1L, "alice", "alice@example.com", "http://avatar", "bio");
        AuthResponseDto responseDto = new AuthResponseDto("jwt-token-xyz", userDto);

        when(authService.register(any(RegisterRequestDto.class))).thenReturn(responseDto);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("jwt-token-xyz"))
                .andExpect(jsonPath("$.user.id").value(1))
                .andExpect(jsonPath("$.user.username").value("alice"))
                .andExpect(jsonPath("$.user.email").value("alice@example.com"));
    }

    @Test
    void registerReturns400WhenInvalidEmailFormat() throws Exception {
        RegisterRequestDto request = new RegisterRequestDto(
                "alice", "invalid-email", "password123", null, null
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Invalid email format"));
    }

    @Test
    void registerReturns400WhenPasswordTooShort() throws Exception {
        RegisterRequestDto request = new RegisterRequestDto(
                "alice", "alice@example.com", "short", null, null
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Password must be at least 8 characters"));
    }

    @Test
    void registerReturns409WhenEmailAlreadyExists() throws Exception {
        RegisterRequestDto request = new RegisterRequestDto(
                "alice", "alice@example.com", "password123", null, null
        );

        when(authService.register(any(RegisterRequestDto.class)))
                .thenThrow(new ConflictException("Email already in use"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Email already in use"));
    }

    @Test
    void registerReturns409WhenUsernameAlreadyExists() throws Exception {
        RegisterRequestDto request = new RegisterRequestDto(
                "alice", "alice@example.com", "password123", null, null
        );

        when(authService.register(any(RegisterRequestDto.class)))
                .thenThrow(new ConflictException("Username already in use"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Username already in use"));
    }

    @Test
    void loginReturns200WhenValidCredentials() throws Exception {
        LoginRequestDto request = new LoginRequestDto("alice@example.com", "password123");
        UserDto userDto = new UserDto(1L, "alice", "alice@example.com", null, null);
        AuthResponseDto responseDto = new AuthResponseDto("jwt-token-xyz", userDto);

        when(authService.login(any(LoginRequestDto.class))).thenReturn(responseDto);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token-xyz"))
                .andExpect(jsonPath("$.user.username").value("alice"));
    }

    @Test
    void loginReturns401WhenBadCredentials() throws Exception {
        LoginRequestDto request = new LoginRequestDto("alice@example.com", "wrong-password");

        when(authService.login(any(LoginRequestDto.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid credentials"));
    }

    @Test
    void loginReturns400WhenMissingFields() throws Exception {
        LoginRequestDto request = new LoginRequestDto("", "");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void logoutReturns200() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Logged out successfully"));
    }

    @Test
    @WithMockUser(username = "alice")
    void meReturns200WhenAuthenticated() throws Exception {
        UserDto userDto = new UserDto(1L, "alice", "alice@example.com", "avatar", "desc");
        when(authService.getCurrentUser("alice")).thenReturn(userDto);

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"));
    }

    @Test
    void meReturns401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }
}
