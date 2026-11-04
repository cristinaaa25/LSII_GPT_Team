package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Comment;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CommentRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private CommentRepository commentRepository;

    private User author;
    private Video video;

    @BeforeEach
    void setUp() {
        author = entityManager.persistFlushFind(new User("author1", "auth1@example.com", "pass"));
        video = entityManager.persistFlushFind(new Video("A Video", "http://media/v.mp4", author));
    }

    @Test
    void testSaveCommentAndReplies() {
        Comment rootComment = new Comment("Great video!", video, author);
        Comment savedRoot = entityManager.persistFlushFind(rootComment);

        assertThat(savedRoot.getId()).isNotNull();
        assertThat(savedRoot.getText()).isEqualTo("Great video!");
        assertThat(savedRoot.getVideo().getId()).isEqualTo(video.getId());
        assertThat(savedRoot.getAuthor().getId()).isEqualTo(author.getId());
        assertThat(savedRoot.getParent()).isNull();
        assertThat(savedRoot.getCreatedAt()).isNotNull();

        User replier = entityManager.persistFlushFind(new User("replier", "replier@example.com", "pass"));
        Comment reply = new Comment("I agree!", video, replier, savedRoot);
        Comment savedReply = entityManager.persistFlushFind(reply);

        assertThat(savedReply.getParent()).isNotNull();
        assertThat(savedReply.getParent().getId()).isEqualTo(savedRoot.getId());

        List<Comment> rootComments = commentRepository.findByVideoIdAndParentIsNullOrderByCreatedAtDesc(video.getId());
        assertThat(rootComments).hasSize(1);
        assertThat(rootComments.get(0).getText()).isEqualTo("Great video!");

        List<Comment> replies = commentRepository.findByParentIdOrderByCreatedAtAsc(savedRoot.getId());
        assertThat(replies).hasSize(1);
        assertThat(replies.get(0).getText()).isEqualTo("I agree!");
    }

    @Test
    void testCommentSetters() {
        Comment comment = new Comment("First text", video, author);
        comment.setText("Edited text");

        User newAuthor = entityManager.persistFlushFind(new User("author2", "auth2@example.com", "pass"));
        Video newVideo = entityManager.persistFlushFind(new Video("Another Video", "http://media/v2.mp4", newAuthor));
        Comment parent = entityManager.persistFlushFind(new Comment("Parent", newVideo, newAuthor));

        comment.setAuthor(newAuthor);
        comment.setVideo(newVideo);
        comment.setParent(parent);

        Comment saved = entityManager.persistFlushFind(comment);
        assertThat(saved.getText()).isEqualTo("Edited text");
        assertThat(saved.getAuthor().getId()).isEqualTo(newAuthor.getId());
        assertThat(saved.getVideo().getId()).isEqualTo(newVideo.getId());
        assertThat(saved.getParent().getId()).isEqualTo(parent.getId());
        assertThat(saved.equals(saved)).isTrue();
        assertThat(saved.equals(null)).isFalse();
        assertThat(saved.equals(new Object())).isFalse();
        assertThat(saved.hashCode()).isEqualTo(saved.getId().hashCode());
    }
}
