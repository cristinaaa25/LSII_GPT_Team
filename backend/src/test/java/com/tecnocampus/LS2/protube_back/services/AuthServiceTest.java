package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.dto.AuthResponseDto;
import com.tecnocampus.LS2.protube_back.dto.LoginRequestDto;
import com.tecnocampus.LS2.protube_back.dto.RegisterRequestDto;
import com.tecnocampus.LS2.protube_back.dto.UserDto;
import com.tecnocampus.LS2.protube_back.exception.ConflictException;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    UserRepository userRepository;

    @Mock
    PasswordEncoder passwordEncoder;

    @Mock
    JwtService jwtService;

    AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void registerSuccessfullyCreatesUserAndReturnsToken() {
        RegisterRequestDto request = new RegisterRequestDto(
                "alice", "alice@example.com", "password123", "https://avatar.png", "Hello I am Alice"
        );

        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");

        User savedUser = new User("alice", "alice@example.com", "encodedPassword", "https://avatar.png", "Hello I am Alice");
        savedUser.setId(10L);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(savedUser)).thenReturn("mocked-jwt-token");

        AuthResponseDto response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.token()).isEqualTo("mocked-jwt-token");
        assertThat(response.user().id()).isEqualTo(10L);
        assertThat(response.user().username()).isEqualTo("alice");
        assertThat(response.user().email()).isEqualTo("alice@example.com");
        assertThat(response.user().avatarUrl()).isEqualTo("https://avatar.png");
        assertThat(response.user().description()).isEqualTo("Hello I am Alice");

        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerThrowsExceptionWhenRequestIsNull() {
        assertThatThrownBy(() -> authService.register(null))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Registration data must not be null");
    }

    @Test
    void registerThrowsExceptionWhenUsernameIsShort() {
        RegisterRequestDto request = new RegisterRequestDto("al", "al@example.com", "password123", null, null);
        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Username must be at least 3 characters");
    }

    @Test
    void registerThrowsExceptionWhenUsernameIsTooLong() {
        String longUsername = "a".repeat(51);
        RegisterRequestDto request = new RegisterRequestDto(longUsername, "al@example.com", "password123", null, null);
        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Username must not exceed 50 characters");
    }

    @Test
    void registerThrowsExceptionWhenEmailIsInvalid() {
        RegisterRequestDto request = new RegisterRequestDto("alice", "not-an-email", "password123", null, null);
        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Invalid email format");
    }

    @Test
    void registerThrowsExceptionWhenPasswordIsLessThan8Chars() {
        RegisterRequestDto request = new RegisterRequestDto("alice", "alice@example.com", "short", null, null);
        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Password must be at least 8 characters");
    }

    @Test
    void registerThrowsConflictWhenEmailAlreadyExists() {
        RegisterRequestDto request = new RegisterRequestDto("alice", "alice@example.com", "password123", null, null);
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email already in use");

        verify(userRepository, never()).save(any());
    }

    @Test
    void registerThrowsConflictWhenUsernameAlreadyExists() {
        RegisterRequestDto request = new RegisterRequestDto("alice", "alice@example.com", "password123", null, null);
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Username already in use");

        verify(userRepository, never()).save(any());
    }

    @Test
    void loginSuccessfullyWithEmail() {
        LoginRequestDto request = new LoginRequestDto("alice@example.com", "password123");
        User user = new User("alice", "alice@example.com", "hashedPassword");
        user.setId(1L);

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashedPassword")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt-token-123");

        AuthResponseDto response = authService.login(request);

        assertThat(response.token()).isEqualTo("jwt-token-123");
        assertThat(response.user().username()).isEqualTo("alice");
    }

    @Test
    void loginSuccessfullyWithUsername() {
        LoginRequestDto request = new LoginRequestDto("alice", "password123");
        User user = new User("alice", "alice@example.com", "hashedPassword");
        user.setId(1L);

        when(userRepository.findByEmail("alice")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashedPassword")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt-token-123");

        AuthResponseDto response = authService.login(request);

        assertThat(response.token()).isEqualTo("jwt-token-123");
        assertThat(response.user().email()).isEqualTo("alice@example.com");
    }

    @Test
    void loginThrowsWhenInvalidRequest() {
        assertThatThrownBy(() -> authService.login(null))
                .isInstanceOf(InvalidRequestException.class);

        assertThatThrownBy(() -> authService.login(new LoginRequestDto("", "password")))
                .isInstanceOf(InvalidRequestException.class);

        assertThatThrownBy(() -> authService.login(new LoginRequestDto("alice@example.com", "")))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void loginThrowsWhenUserNotFound() {
        LoginRequestDto request = new LoginRequestDto("bob@example.com", "password123");
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("bob@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    void loginThrowsWhenPasswordDoesNotMatch() {
        LoginRequestDto request = new LoginRequestDto("alice@example.com", "wrongPassword");
        User user = new User("alice", "alice@example.com", "hashedPassword");

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPassword", "hashedPassword")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    void getCurrentUserReturnsUserDto() {
        User user = new User("alice", "alice@example.com", "hash", "avatar", "bio");
        user.setId(5L);

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        UserDto userDto = authService.getCurrentUser("alice");

        assertThat(userDto.id()).isEqualTo(5L);
        assertThat(userDto.username()).isEqualTo("alice");
        assertThat(userDto.email()).isEqualTo("alice@example.com");
        assertThat(userDto.avatarUrl()).isEqualTo("avatar");
        assertThat(userDto.description()).isEqualTo("bio");
    }

    @Test
    void getCurrentUserThrowsWhenNotFound() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getCurrentUser("unknown"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    void getCurrentUserThrowsWhenNullOrBlank() {
        assertThatThrownBy(() -> authService.getCurrentUser(null))
                .isInstanceOf(BadCredentialsException.class);

        assertThatThrownBy(() -> authService.getCurrentUser("   "))
                .isInstanceOf(BadCredentialsException.class);
    }
}
