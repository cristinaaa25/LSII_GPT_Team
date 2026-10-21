package com.tecnocampus.LS2.protube_back.security;

import com.tecnocampus.LS2.protube_back.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService("a-very-long-secret-key-that-is-at-least-256-bits-long-for-testing-1234567890", 3600000L);
    }

    @Test
    void generatesAndValidatesValidToken() {
        User user = new User("alice", "alice@example.com", "password");
        user.setId(42L);

        String token = jwtService.generateToken(user);

        assertThat(token).isNotBlank();
        assertThat(jwtService.validateToken(token)).isTrue();
        assertThat(jwtService.getUsernameFromToken(token)).isEqualTo("alice");
        assertThat(jwtService.getUserIdFromToken(token)).isEqualTo(42L);
    }

    @Test
    void rejectsInvalidAndTamperedTokens() {
        assertThat(jwtService.validateToken(null)).isFalse();
        assertThat(jwtService.validateToken("")).isFalse();
        assertThat(jwtService.validateToken("not-a-jwt")).isFalse();
        assertThat(jwtService.validateToken("header.payload.signature")).isFalse();
    }

    @Test
    void rejectsExpiredToken() {
        JwtService shortLivedJwtService = new JwtService(
                "a-very-long-secret-key-that-is-at-least-256-bits-long-for-testing-1234567890",
                -1000L
        );
        User user = new User("alice", "alice@example.com", "password");
        user.setId(1L);

        String token = shortLivedJwtService.generateToken(user);

        assertThat(jwtService.validateToken(token)).isFalse();
    }
}
