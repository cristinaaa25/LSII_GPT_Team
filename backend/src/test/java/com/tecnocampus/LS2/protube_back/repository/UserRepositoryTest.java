package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testSaveAndFindUser() {
        User user = new User("alice", "alice@example.com", "secret123", "https://avatar.png", "Bio description");
        User saved = entityManager.persistFlushFind(user);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getUsername()).isEqualTo("alice");
        assertThat(saved.getEmail()).isEqualTo("alice@example.com");
        assertThat(saved.getAvatarUrl()).isEqualTo("https://avatar.png");
        assertThat(saved.getDescription()).isEqualTo("Bio description");
        assertThat(saved.getCreatedAt()).isNotNull();

        Optional<User> foundByUsername = userRepository.findByUsername("alice");
        assertThat(foundByUsername).isPresent();
        assertThat(foundByUsername.get().getEmail()).isEqualTo("alice@example.com");

        Optional<User> foundByEmail = userRepository.findByEmail("alice@example.com");
        assertThat(foundByEmail).isPresent();

        assertThat(userRepository.existsByUsername("alice")).isTrue();
        assertThat(userRepository.existsByUsername("unknown")).isFalse();
        assertThat(userRepository.existsByEmail("alice@example.com")).isTrue();
        assertThat(userRepository.existsByEmail("unknown@example.com")).isFalse();
    }

    @Test
    void testUserConstructorsAndSetters() {
        User user = new User("bob", "bob@example.com", "pass");
        user.setUsername("bob2");
        user.setEmail("bob2@example.com");
        user.setPassword("newpass");
        user.setAvatarUrl("avatar2");
        user.setDescription("desc2");

        User saved = entityManager.persistFlushFind(user);
        assertThat(saved.getUsername()).isEqualTo("bob2");
        assertThat(saved.getPassword()).isEqualTo("newpass");
        assertThat(saved.equals(saved)).isTrue();
        assertThat(saved.equals(null)).isFalse();
        assertThat(saved.equals(new Object())).isFalse();
        assertThat(saved.hashCode()).isEqualTo(saved.getId().hashCode());
    }
}
