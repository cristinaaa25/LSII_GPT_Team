package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.Subscription;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.dto.ChannelDto;
import com.tecnocampus.LS2.protube_back.dto.VideoDetailDto;
import com.tecnocampus.LS2.protube_back.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Subscriptions run a fixed number of SQL statements whatever the number of channels, subscribers or videos
 * (no N+1). Counted with Hibernate statistics.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@ActiveProfiles("test")
@Transactional
class SubscriptionQueryCountTest {

    // subscriber + subscriptions with their channel + ONE grouped subscriber count for all channels
    private static final long SUBSCRIPTIONS_QUERIES = 3;
    // subscriber + feed page (uploader fetched in the same query; no count query when the page is not full)
    private static final long FEED_QUERIES = 2;
    // user + first page of videos + subscriber count (+ subscribedByMe when there is a viewer)
    private static final long PROFILE_ANONYMOUS_QUERIES = 3;
    private static final long PROFILE_VIEWER_QUERIES = 4;
    // video + tags + categories + comment count + uploader (5, as before ticket 26) + ONE author subscriber count
    private static final long VIDEO_ANONYMOUS_QUERIES = 6;
    // the same + current user + likedByMe + subscribedByMe
    private static final long VIDEO_VIEWER_QUERIES = 9;
    // own video: subscribedByMe is not queried, and the uploader is the current user already loaded
    private static final long VIDEO_OWNER_QUERIES = 7;

    @Autowired
    SubscriptionService subscriptionService;

    @Autowired
    UserService userService;

    @Autowired
    VideoService videoService;

    @Autowired
    EntityManager entityManager;

    @Autowired
    EntityManagerFactory entityManagerFactory;

    private Statistics statistics;

    @BeforeEach
    void setUp() {
        statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void videoDetailRunsTheSameQueriesWhateverTheNumberOfSubscribers() {
        User author = persist(new User("qc_author", "qc_author@example.com", "pass"));
        User viewer = persist(new User("qc_vfan_0", "qc_vfan_0@example.com", "pass"));
        persist(new Subscription(viewer, author));
        for (int i = 1; i < 20; i++) {
            persist(new Subscription(persist(new User("qc_vfan_" + i, "qc_vfan_" + i + "@example.com", "pass")), author));
        }
        Video video = persist(new Video("Author video", "/media/author.mp4", author));

        assertThat(countVideoQueries(video, null)).isEqualTo(VIDEO_ANONYMOUS_QUERIES);
        assertThat(countVideoQueries(video, viewer)).isEqualTo(VIDEO_VIEWER_QUERIES);
        assertThat(countVideoQueries(video, author)).isEqualTo(VIDEO_OWNER_QUERIES);

        authenticate(viewer);
        VideoDetailDto detail = videoService.getVideo(video.getId());
        assertThat(detail.authorSubscriberCount()).isEqualTo(20);
        assertThat(detail.subscribedByMe()).isTrue();
        authenticate(author);
        assertThat(videoService.getVideo(video.getId()).subscribedByMe()).isFalse();
    }

    private long countVideoQueries(Video video, User viewer) {
        if (viewer == null) {
            SecurityContextHolder.clearContext();
        } else {
            authenticate(viewer);
        }
        reset();
        videoService.getVideo(video.getId());
        return statistics.getPrepareStatementCount();
    }

    private void authenticate(User user) {
        UserPrincipal principal = UserPrincipal.fromUser(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @Test
    void subscriptionsListUsesOneGroupedCountForFewAndManyChannels() {
        User few = subscriberOf("few", 2);
        User many = subscriberOf("many", 15);

        assertThat(countSubscriptionsQueries(few)).isEqualTo(SUBSCRIPTIONS_QUERIES);
        assertThat(countSubscriptionsQueries(many)).isEqualTo(SUBSCRIPTIONS_QUERIES);

        // And the counts are right: every channel of "many" has 2 subscribers ("many" and one extra fan)
        List<ChannelDto> channels = subscriptionService.getSubscriptions(many.getUsername());
        assertThat(channels).hasSize(15).allMatch(c -> c.subscriberCount() == 2);
    }

    @Test
    void feedRunsTheSameQueriesForFewAndManyChannels() {
        User few = subscriberOf("ffew", 2);
        User many = subscriberOf("fmany", 15);

        assertThat(countFeedQueries(few)).isEqualTo(FEED_QUERIES);
        assertThat(countFeedQueries(many)).isEqualTo(FEED_QUERIES);
    }

    @Test
    void publicProfileRunsTheSameQueriesWhateverTheNumberOfSubscribers() {
        User channel = persist(new User("qc_star", "qc_star@example.com", "pass"));
        User viewer = persist(new User("qc_fan_0", "qc_fan_0@example.com", "pass"));
        persist(new Subscription(viewer, channel));
        for (int i = 1; i < 20; i++) {
            persist(new Subscription(persist(new User("qc_fan_" + i, "qc_fan_" + i + "@example.com", "pass")), channel));
        }

        assertThat(countProfileQueries(null)).isEqualTo(PROFILE_ANONYMOUS_QUERIES);
        assertThat(countProfileQueries("qc_fan_0")).isEqualTo(PROFILE_VIEWER_QUERIES);
        assertThat(userService.getPublicProfile("qc_star", "qc_fan_0").subscriberCount()).isEqualTo(20);
    }

    private long countSubscriptionsQueries(User subscriber) {
        reset();
        subscriptionService.getSubscriptions(subscriber.getUsername());
        return statistics.getPrepareStatementCount();
    }

    private long countFeedQueries(User subscriber) {
        reset();
        // Page size above the number of videos: Spring Data skips the count query, so the result is exact
        assertThat(subscriptionService.getFeed(subscriber.getUsername(), 0, 50).content()).isNotEmpty();
        return statistics.getPrepareStatementCount();
    }

    private long countProfileQueries(String viewer) {
        reset();
        userService.getPublicProfile("qc_star", viewer);
        return statistics.getPrepareStatementCount();
    }

    /** Start from an empty persistence context so nothing is served from the first-level cache. */
    private void reset() {
        entityManager.flush();
        entityManager.clear();
        statistics.clear();
    }

    /** A user subscribed to {@code channels} channels, each with one video and one more subscriber. */
    private User subscriberOf(String name, int channels) {
        User subscriber = persist(new User("qc_" + name, "qc_" + name + "@example.com", "pass"));
        User fan = persist(new User("qc_fan_" + name, "qc_fan_" + name + "@example.com", "pass"));
        for (int i = 0; i < channels; i++) {
            User channel = persist(new User("qc_" + name + "_ch" + i, "qc_" + name + "_ch" + i + "@example.com", "pass"));
            persist(new Video("Video " + name + " " + i, "/media/" + name + i + ".mp4", channel));
            persist(new Subscription(subscriber, channel));
            persist(new Subscription(fan, channel));
        }
        return subscriber;
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
