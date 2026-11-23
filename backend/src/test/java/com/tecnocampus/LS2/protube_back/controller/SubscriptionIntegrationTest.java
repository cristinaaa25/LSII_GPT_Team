package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.domain.Subscription;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.repository.SubscriptionRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Subscriptions end to end through HTTP + security + H2 with the V6 migration. */
@SpringBootTest(properties = "pro_tube.store.dir=target/test-store/")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SubscriptionIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VideoRepository videoRepository;

    @Autowired
    SubscriptionRepository subscriptionRepository;

    @Autowired
    JwtService jwtService;

    // Same secret as the application's JwtService, to sign an already expired token
    @Value("${pro_tube.jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    String jwtSecret;

    private User viewer;
    private User alice;
    private User bob;
    private String token;

    @BeforeEach
    void setUp() {
        viewer = userRepository.save(new User("sub_viewer", "sub_viewer@example.com", "pass"));
        alice = userRepository.save(new User("sub_alice", "sub_alice@example.com", "pass"));
        bob = userRepository.save(new User("sub_bob", "sub_bob@example.com", "pass"));
        token = jwtService.generateToken(viewer);
    }

    // ---- PUT / DELETE /api/users/{username}/subscription ----

    @Test
    void subscribeIsIdempotent() throws Exception {
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(put("/api/users/sub_alice/subscription").header("Authorization", bearer(token)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.username").value("sub_alice"))
                    .andExpect(jsonPath("$.subscriberCount").value(1))
                    .andExpect(jsonPath("$.subscribedByMe").value(true));
        }
        assertThat(subscriptionRepository.countByChannelId(alice.getId())).isEqualTo(1);
    }

    @Test
    void unsubscribeIsIdempotent() throws Exception {
        subscriptionRepository.save(new Subscription(viewer, alice));

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(delete("/api/users/sub_alice/subscription").header("Authorization", bearer(token)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.subscriberCount").value(0))
                    .andExpect(jsonPath("$.subscribedByMe").value(false));
        }
        assertThat(subscriptionRepository.existsBySubscriberIdAndChannelId(viewer.getId(), alice.getId())).isFalse();
    }

    @Test
    void subscribingToYourselfReturns400() throws Exception {
        mockMvc.perform(put("/api/users/sub_viewer/subscription").header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/users/sub_viewer/subscription").header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest());
        assertThat(subscriptionRepository.countByChannelId(viewer.getId())).isZero();
    }

    @Test
    void unknownUserReturns404() throws Exception {
        mockMvc.perform(put("/api/users/sub_nobody/subscription").header("Authorization", bearer(token)))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/users/sub_nobody/subscription").header("Authorization", bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void anonymousRequestsReturn401() throws Exception {
        mockMvc.perform(put("/api/users/sub_alice/subscription")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/users/sub_alice/subscription")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users/me/subscriptions")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users/me/feed")).andExpect(status().isUnauthorized());
        // An invalid token is the same as no token on protected endpoints
        mockMvc.perform(put("/api/users/sub_alice/subscription").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void countsReflectSeveralSubscribers() throws Exception {
        String bobToken = jwtService.generateToken(bob);
        mockMvc.perform(put("/api/users/sub_alice/subscription").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.subscriberCount").value(1));
        mockMvc.perform(put("/api/users/sub_alice/subscription").header("Authorization", bearer(bobToken)))
                .andExpect(jsonPath("$.subscriberCount").value(2));
        mockMvc.perform(delete("/api/users/sub_alice/subscription").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.subscriberCount").value(1));

        mockMvc.perform(get("/api/users/sub_alice"))
                .andExpect(jsonPath("$.subscriberCount").value(1));
    }

    // ---- GET /api/users/{username} ----

    @Test
    void publicProfileShowsSubscriberCountAndSubscribedByMe() throws Exception {
        subscriptionRepository.save(new Subscription(viewer, alice));
        subscriptionRepository.save(new Subscription(bob, alice));

        mockMvc.perform(get("/api/users/sub_alice").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("sub_alice"))
                .andExpect(jsonPath("$.videos").isArray())
                .andExpect(jsonPath("$.subscriberCount").value(2))
                .andExpect(jsonPath("$.subscribedByMe").value(true));

        // Anonymous: same count, never subscribed
        mockMvc.perform(get("/api/users/sub_alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subscriberCount").value(2))
                .andExpect(jsonPath("$.subscribedByMe").value(false));

        // Own profile
        mockMvc.perform(get("/api/users/sub_viewer").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.subscriberCount").value(0))
                .andExpect(jsonPath("$.subscribedByMe").value(false));
    }

    @Test
    void publicProfileWithInvalidOrExpiredTokenReturns200AndNotSubscribed() throws Exception {
        // The viewer IS subscribed: only a valid token may reveal it
        subscriptionRepository.save(new Subscription(viewer, alice));
        String expired = new JwtService(jwtSecret, -60_000).generateToken(viewer);
        String wrongSignature = new JwtService("another-secret", 60_000).generateToken(viewer);

        for (String bad : new String[]{expired, wrongSignature, "not-a-jwt"}) {
            mockMvc.perform(get("/api/users/sub_alice").header("Authorization", bearer(bad)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.subscriberCount").value(1))
                    .andExpect(jsonPath("$.subscribedByMe").value(false));
        }
    }

    // ---- GET /api/users/me/subscriptions ----

    @Test
    void mySubscriptionsListsChannelsWithCountsMostRecentFirst() throws Exception {
        Subscription toAlice = new Subscription(viewer, alice);
        toAlice.setCreatedAt(Instant.parse("2026-11-01T10:00:00Z"));
        subscriptionRepository.save(toAlice);
        Subscription toBob = new Subscription(viewer, bob);
        toBob.setCreatedAt(Instant.parse("2026-11-02T10:00:00Z"));
        subscriptionRepository.save(toBob);
        subscriptionRepository.save(new Subscription(bob, alice));

        mockMvc.perform(get("/api/users/me/subscriptions").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].username", contains("sub_bob", "sub_alice")))
                .andExpect(jsonPath("$[0].subscriberCount").value(1))
                .andExpect(jsonPath("$[1].subscriberCount").value(2))
                .andExpect(jsonPath("$[0].subscribedAt").value("2026-11-02T10:00:00Z"));
    }

    @Test
    void mySubscriptionsIsEmptyWithoutSubscriptions() throws Exception {
        mockMvc.perform(get("/api/users/me/subscriptions").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", empty()));
    }

    // ---- GET /api/users/me/feed ----

    @Test
    void feedHasOnlySubscribedChannelsNewestFirstAndIsPaged() throws Exception {
        User stranger = userRepository.save(new User("sub_stranger", "sub_stranger@example.com", "pass"));
        subscriptionRepository.save(new Subscription(viewer, alice));
        subscriptionRepository.save(new Subscription(viewer, bob));

        video("A old", alice, "2026-11-01T10:00:00Z");
        video("B mid", bob, "2026-11-02T10:00:00Z");
        // Same time: the higher id goes first
        video("A tie 1", alice, "2026-11-03T10:00:00Z");
        video("B tie 2", bob, "2026-11-03T10:00:00Z");
        video("Stranger newest", stranger, "2026-11-04T10:00:00Z");
        video("Own video", viewer, "2026-11-04T10:00:00Z");

        mockMvc.perform(get("/api/users/me/feed").param("page", "0").param("size", "2")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title", contains("B tie 2", "A tie 1")))
                .andExpect(jsonPath("$.totalElements").value(4))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.last").value(false));

        mockMvc.perform(get("/api/users/me/feed").param("page", "1").param("size", "2")
                        .header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.content[*].title", contains("B mid", "A old")))
                .andExpect(jsonPath("$.content[0].author").value("sub_bob"))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.last").value(true));

        mockMvc.perform(get("/api/users/me/feed").param("page", "2").param("size", "2")
                        .header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.content", empty()));
    }

    @Test
    void feedIsEmptyWithoutSubscriptionsAndValidatesPaging() throws Exception {
        video("A only", alice, "2026-11-01T10:00:00Z");

        mockMvc.perform(get("/api/users/me/feed").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", empty()))
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.size").value(12));

        mockMvc.perform(get("/api/users/me/feed").param("page", "-1").header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/users/me/feed").param("size", "0").header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest());
    }

    // ---- GET /api/videos/{id}: the author's channel ----

    @Test
    void videoDetailShowsAuthorSubscribersAndSubscribedByMe() throws Exception {
        Long videoId = video("Alice clip", alice, "2026-11-01T10:00:00Z");
        subscriptionRepository.save(new Subscription(viewer, alice));
        subscriptionRepository.save(new Subscription(bob, alice));

        // Subscribed viewer
        mockMvc.perform(get("/api/videos/" + videoId).header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.author").value("sub_alice"))
                .andExpect(jsonPath("$.title").value("Alice clip"))
                .andExpect(jsonPath("$.likedByMe").value(false))
                .andExpect(jsonPath("$.authorSubscriberCount").value(2))
                .andExpect(jsonPath("$.subscribedByMe").value(true));

        // Anonymous
        mockMvc.perform(get("/api/videos/" + videoId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorSubscriberCount").value(2))
                .andExpect(jsonPath("$.subscribedByMe").value(false));

        // Logged in but not subscribed
        User carol = userRepository.save(new User("sub_carol", "sub_carol@example.com", "pass"));
        mockMvc.perform(get("/api/videos/" + videoId).header("Authorization", bearer(jwtService.generateToken(carol))))
                .andExpect(jsonPath("$.authorSubscriberCount").value(2))
                .andExpect(jsonPath("$.subscribedByMe").value(false));
    }

    @Test
    void videoDetailOnYourOwnVideoIsNeverSubscribed() throws Exception {
        Long videoId = video("Own clip", viewer, "2026-11-01T10:00:00Z");
        subscriptionRepository.save(new Subscription(alice, viewer));

        mockMvc.perform(get("/api/videos/" + videoId).header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorSubscriberCount").value(1))
                .andExpect(jsonPath("$.subscribedByMe").value(false));
    }

    @Test
    void videoDetailWithInvalidOrExpiredTokenReturns200AndNotSubscribed() throws Exception {
        Long videoId = video("Alice clip", alice, "2026-11-01T10:00:00Z");
        subscriptionRepository.save(new Subscription(viewer, alice));
        String expired = new JwtService(jwtSecret, -60_000).generateToken(viewer);
        String wrongSignature = new JwtService("another-secret", 60_000).generateToken(viewer);

        for (String bad : new String[]{expired, wrongSignature, "not-a-jwt"}) {
            mockMvc.perform(get("/api/videos/" + videoId).header("Authorization", bearer(bad)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.authorSubscriberCount").value(1))
                    .andExpect(jsonPath("$.subscribedByMe").value(false));
        }
    }

    @Test
    void editingAVideoKeepsTheAuthorSubscriberCountInTheResponse() throws Exception {
        Long videoId = video("Own clip", viewer, "2026-11-01T10:00:00Z");
        subscriptionRepository.save(new Subscription(alice, viewer));
        subscriptionRepository.save(new Subscription(bob, viewer));

        mockMvc.perform(put("/api/videos/" + videoId).header("Authorization", bearer(token))
                        .contentType("application/json")
                        .content("{\"title\":\"Renamed\",\"description\":\"New\",\"tags\":[],\"categories\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Renamed"))
                .andExpect(jsonPath("$.authorSubscriberCount").value(2))
                .andExpect(jsonPath("$.subscribedByMe").value(false));
    }

    private Long video(String title, User uploader, String createdAt) {
        Video video = new Video(title, "/media/" + title.replace(' ', '_') + ".mp4", uploader);
        video.setCreatedAt(Instant.parse(createdAt));
        return videoRepository.save(video).getId();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
