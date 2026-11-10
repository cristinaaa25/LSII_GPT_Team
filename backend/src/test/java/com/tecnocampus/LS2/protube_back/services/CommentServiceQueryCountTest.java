package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.Comment;
import com.tecnocampus.LS2.protube_back.domain.CommentLike;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.dto.CommentDto;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * GET /api/videos/{id}/comments must run a fixed number of SQL statements per page, whatever the number of comments
 * (no N+1). Counted with Hibernate statistics.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@ActiveProfiles("test")
@Transactional
class CommentServiceQueryCountTest {

    // existsById + root page + replies of the page + like counts
    private static final long ANONYMOUS_QUERIES = 4;
    // the same + current user + likedByMe
    private static final long AUTHENTICATED_QUERIES = 6;

    @Autowired
    private CommentService commentService;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private Statistics statistics;
    private User viewer;

    @BeforeEach
    void setUp() {
        statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        viewer = persist(new User("qc_viewer", "qc_viewer@example.com", "pass"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void anonymousRequestRunsTheSameQueriesForFewAndManyComments() {
        Video few = videoWithComments("few", 2);
        Video many = videoWithComments("many", 20);

        assertThat(countQueries(few)).isEqualTo(ANONYMOUS_QUERIES);
        assertThat(countQueries(many)).isEqualTo(ANONYMOUS_QUERIES);
    }

    @Test
    void authenticatedRequestRunsTheSameQueriesForFewAndManyComments() {
        Video few = videoWithComments("few", 2);
        Video many = videoWithComments("many", 20);
        UserPrincipal principal = UserPrincipal.fromUser(viewer);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));

        assertThat(countQueries(few)).isEqualTo(AUTHENTICATED_QUERIES);
        assertThat(countQueries(many)).isEqualTo(AUTHENTICATED_QUERIES);

        PageDto<CommentDto> page = commentService.getComments(many.getId(), 0, 50);
        assertThat(page.content()).hasSize(20).allMatch(c -> c.likeCount() == 1 && c.likedByMe());
        assertThat(page.content()).allMatch(c -> c.replies().size() == 2
                && c.replies().stream().allMatch(r -> r.likeCount() == 0 && !r.likedByMe()));
    }

    private long countQueries(Video video) {
        // Start from an empty persistence context so nothing is served from the first-level cache
        entityManager.flush();
        entityManager.clear();
        statistics.clear();

        // Page size above the number of roots: Spring Data skips the count query, so the result is exact
        commentService.getComments(video.getId(), 0, 50);

        return statistics.getPrepareStatementCount();
    }

    /** A video with {@code roots} root comments, each with 2 replies and 1 like from the viewer. */
    private Video videoWithComments(String name, int roots) {
        User author = persist(new User("qc_" + name, "qc_" + name + "@example.com", "pass"));
        Video video = persist(new Video("Video " + name, "/media/" + name + ".mp4", author));
        for (int i = 0; i < roots; i++) {
            Comment root = persist(new Comment("Root " + i, video, author));
            persist(new Comment("Reply A " + i, video, viewer, root));
            persist(new Comment("Reply B " + i, video, author, root));
            persist(new CommentLike(root, viewer));
        }
        return video;
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
