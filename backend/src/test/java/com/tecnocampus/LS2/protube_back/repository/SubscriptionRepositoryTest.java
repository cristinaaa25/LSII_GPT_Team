package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Subscription;
import com.tecnocampus.LS2.protube_back.domain.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** V6 constraints and the custom queries of {@link SubscriptionRepository}, on H2 with Flyway. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class SubscriptionRepositoryTest {

    @Autowired
    SubscriptionRepository subscriptionRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    EntityManager entityManager;

    @Autowired
    JdbcTemplate jdbcTemplate;

    private User ann;
    private User ben;
    private User cat;

    @BeforeEach
    void setUp() {
        ann = userRepository.save(new User("repo_ann", "repo_ann@example.com", "pass"));
        ben = userRepository.save(new User("repo_ben", "repo_ben@example.com", "pass"));
        cat = userRepository.save(new User("repo_cat", "repo_cat@example.com", "pass"));
        userRepository.flush();
    }

    @Test
    void thePairIsUnique() {
        insert(ann, ben);
        assertThatThrownBy(() -> insert(ann, ben)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void subscribingToYourselfIsRejectedByTheDatabase() {
        assertThatThrownBy(() -> insert(ann, ann)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingAUserDeletesItsSubscriptions() {
        insert(ann, ben);
        insert(cat, ann);
        jdbcTemplate.update("DELETE FROM users WHERE id = ?", ann.getId());
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM subscriptions", Long.class)).isZero();
    }

    @Test
    void existsCountAndDelete() {
        subscriptionRepository.saveAndFlush(new Subscription(ann, ben));
        subscriptionRepository.saveAndFlush(new Subscription(cat, ben));

        assertThat(subscriptionRepository.existsBySubscriberIdAndChannelId(ann.getId(), ben.getId())).isTrue();
        assertThat(subscriptionRepository.existsBySubscriberIdAndChannelId(ben.getId(), ann.getId())).isFalse();
        assertThat(subscriptionRepository.existsBySubscriberUsernameAndChannelId("repo_ann", ben.getId())).isTrue();
        assertThat(subscriptionRepository.existsBySubscriberUsernameAndChannelId("repo_ben", ben.getId())).isFalse();
        assertThat(subscriptionRepository.countByChannelId(ben.getId())).isEqualTo(2);

        assertThat(subscriptionRepository.deleteBySubscriberIdAndChannelId(ann.getId(), ben.getId())).isEqualTo(1);
        assertThat(subscriptionRepository.deleteBySubscriberIdAndChannelId(ann.getId(), ben.getId())).isZero();
        assertThat(subscriptionRepository.countByChannelId(ben.getId())).isEqualTo(1);
    }

    @Test
    void subscriberCountsAreGroupedPerChannel() {
        subscriptionRepository.saveAndFlush(new Subscription(ann, ben));
        subscriptionRepository.saveAndFlush(new Subscription(cat, ben));
        subscriptionRepository.saveAndFlush(new Subscription(ben, cat));

        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : subscriptionRepository.countSubscribersByChannelIds(
                List.of(ann.getId(), ben.getId(), cat.getId()))) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        // Channels without subscribers do not appear
        assertThat(counts).containsOnly(Map.entry(ben.getId(), 2L), Map.entry(cat.getId(), 1L));
    }

    private void insert(User subscriber, User channel) {
        jdbcTemplate.update("INSERT INTO subscriptions (subscriber_id, channel_id) VALUES (?, ?)",
                subscriber.getId(), channel.getId());
    }
}
