package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Comment;
import com.tecnocampus.LS2.protube_back.domain.CommentLike;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import org.junit.jupiter.api.BeforeEach;
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
class CommentLikeRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private CommentLikeRepository commentLikeRepository;

    private User user;
    private Comment comment;

    @BeforeEach
    void setUp() {
        user = entityManager.persistFlushFind(new User("liker", "liker@example.com", "pass"));
        Video video = entityManager.persistFlushFind(new Video("A Video", "http://media/v.mp4", user));
        comment = entityManager.persistFlushFind(new Comment("Nice!", video, user));
    }

    @Test
    void testSaveAndFindCommentLike() {
        CommentLike like = new CommentLike(comment, user);
        CommentLike saved = entityManager.persistFlushFind(like);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getComment().getId()).isEqualTo(comment.getId());
        assertThat(saved.getUser().getId()).isEqualTo(user.getId());
        assertThat(saved.getCreatedAt()).isNotNull();

        Optional<CommentLike> found = commentLikeRepository.findByCommentIdAndUserId(comment.getId(), user.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(saved.getId());

        assertThat(commentLikeRepository.existsByCommentIdAndUserId(comment.getId(), user.getId())).isTrue();
        assertThat(commentLikeRepository.countByCommentId(comment.getId())).isEqualTo(1L);

        // Delete like (unlike)
        commentLikeRepository.delete(found.get());
        entityManager.flush();

        assertThat(commentLikeRepository.existsByCommentIdAndUserId(comment.getId(), user.getId())).isFalse();
        assertThat(commentLikeRepository.countByCommentId(comment.getId())).isEqualTo(0L);
    }

    @Test
    void testCommentLikeSetters() {
        CommentLike like = new CommentLike();
        like.setComment(comment);
        like.setUser(user);

        CommentLike saved = entityManager.persistFlushFind(like);
        assertThat(saved.getComment().getId()).isEqualTo(comment.getId());
        assertThat(saved.getUser().getId()).isEqualTo(user.getId());
        assertThat(saved.equals(saved)).isTrue();
        assertThat(saved.equals(null)).isFalse();
        assertThat(saved.equals(new Object())).isFalse();
        assertThat(saved.hashCode()).isEqualTo(saved.getId().hashCode());
    }
}
