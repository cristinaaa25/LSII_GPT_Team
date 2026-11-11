package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// V4__google_login.sql applied by Flyway on H2 (PostgreSQL mode)
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class GoogleLoginMigrationTest {

    @Autowired
    UserRepository userRepository;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void migrationV4IsApplied() {
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM \"flyway_schema_history\" WHERE \"version\" = '4' AND \"success\" = TRUE",
                Integer.class);
        assertThat(applied).isEqualTo(1);
    }

    @Test
    void userWithoutPasswordCanBeSavedAndFoundByGoogleSub() {
        User user = new User("googler", "googler@gmail.com", null);
        user.setGoogleSub("google-sub-1");
        userRepository.saveAndFlush(user);

        User found = userRepository.findByGoogleSub("google-sub-1").orElseThrow();
        assertThat(found.getUsername()).isEqualTo("googler");
        assertThat(found.getPassword()).isNull();
        assertThat(userRepository.findByGoogleSub("unknown")).isEmpty();
    }

    @Test
    void googleSubIsUnique() {
        User first = new User("first", "first@gmail.com", null);
        first.setGoogleSub("same-sub");
        userRepository.saveAndFlush(first);

        User second = new User("second", "second@gmail.com", null);
        second.setGoogleSub("same-sub");
        assertThatThrownBy(() -> userRepository.saveAndFlush(second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void manyLocalUsersCanHaveNoGoogleSub() {
        userRepository.saveAndFlush(new User("local1", "local1@example.com", "hash1"));
        userRepository.saveAndFlush(new User("local2", "local2@example.com", "hash2"));

        assertThat(userRepository.findByUsername("local1")).get().extracting(User::getGoogleSub).isNull();
        assertThat(userRepository.findByUsername("local2")).isPresent();
    }
}
