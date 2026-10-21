package com.tecnocampus.LS2.protube_back.security;

import com.tecnocampus.LS2.protube_back.domain.User;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserPrincipalTest {

    @Test
    void buildsFromUserAndExposesProperties() {
        User user = new User("alice", "alice@example.com", "pass123", "http://avatar.jpg", "bio");
        user.setId(99L);

        UserPrincipal principal = UserPrincipal.fromUser(user);

        assertThat(principal.getId()).isEqualTo(99L);
        assertThat(principal.getUsername()).isEqualTo("alice");
        assertThat(principal.getEmail()).isEqualTo("alice@example.com");
        assertThat(principal.getPassword()).isEqualTo("pass123");
        assertThat(principal.getAvatarUrl()).isEqualTo("http://avatar.jpg");
        assertThat(principal.getDescription()).isEqualTo("bio");
        assertThat(principal.getAuthorities()).isNotEmpty();
        assertThat(principal.isAccountNonExpired()).isTrue();
        assertThat(principal.isAccountNonLocked()).isTrue();
        assertThat(principal.isCredentialsNonExpired()).isTrue();
        assertThat(principal.isEnabled()).isTrue();
    }
}
