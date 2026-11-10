package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.Comment;
import com.tecnocampus.LS2.protube_back.domain.CommentLike;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.dto.CommentDto;
import com.tecnocampus.LS2.protube_back.dto.CommentLikeDto;
import com.tecnocampus.LS2.protube_back.dto.CommentRequestDto;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.CommentLikeRepository;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private CommentLikeRepository commentLikeRepository;

    @Mock
    private VideoRepository videoRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CommentService commentService;

    private User user;
    private Video video;
    private Comment rootComment;
    private Comment replyComment;

    @BeforeEach
    void setUp() {
        user = new User("alice", "alice@example.com", "pass");
        user.setId(10L);

        video = new Video("Sample Video", "http://media/sample.mp4", user);
        video.setId(100L);

        rootComment = new Comment("Great video!", video, user);
        rootComment.setId(200L);

        replyComment = new Comment("Thanks!", video, user, rootComment);
        replyComment.setId(201L);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockAuthentication(User user) {
        UserPrincipal principal = UserPrincipal.fromUser(user);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void getComments_validAnonymousUser_returnsCommentsWithReplies() {
        when(videoRepository.existsById(100L)).thenReturn(true);
        when(commentRepository.findByVideoIdAndParentIsNullOrderByCreatedAtDesc(eq(100L), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(rootComment)));
        when(commentRepository.findByParentIdInOrderByCreatedAtAsc(List.of(200L)))
                .thenReturn(List.of(replyComment));
        when(commentLikeRepository.countByCommentIds(List.of(200L, 201L)))
                .thenReturn(List.of(likeCount(200L, 5L), likeCount(201L, 1L)));

        PageDto<CommentDto> result = commentService.getComments(100L, 0, 10);

        assertThat(result.content()).hasSize(1);
        CommentDto rootDto = result.content().get(0);
        assertThat(rootDto.id()).isEqualTo(200L);
        assertThat(rootDto.text()).isEqualTo("Great video!");
        assertThat(rootDto.author()).isEqualTo("alice");
        assertThat(rootDto.likeCount()).isEqualTo(5L);
        assertThat(rootDto.likedByMe()).isFalse();
        assertThat(rootDto.replies()).hasSize(1);

        CommentDto replyDto = rootDto.replies().get(0);
        assertThat(replyDto.id()).isEqualTo(201L);
        assertThat(replyDto.text()).isEqualTo("Thanks!");
        assertThat(replyDto.parentId()).isEqualTo(200L);
        assertThat(replyDto.likeCount()).isEqualTo(1L);
        assertThat(replyDto.likedByMe()).isFalse();

        // Anonymous: likedByMe is never queried
        verify(commentLikeRepository, never()).findLikedCommentIds(any(), any());
    }

    @Test
    void getComments_usesBatchQueriesNotOneQueryPerComment() {
        Comment secondRoot = new Comment("Second", video, user);
        secondRoot.setId(202L);
        mockAuthentication(user);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(videoRepository.existsById(100L)).thenReturn(true);
        when(commentRepository.findByVideoIdAndParentIsNullOrderByCreatedAtDesc(eq(100L), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(rootComment, secondRoot)));
        when(commentRepository.findByParentIdInOrderByCreatedAtAsc(List.of(200L, 202L)))
                .thenReturn(List.of(replyComment));
        when(commentLikeRepository.countByCommentIds(List.of(200L, 202L, 201L))).thenReturn(List.of());
        when(commentLikeRepository.findLikedCommentIds(10L, List.of(200L, 202L, 201L))).thenReturn(List.of(201L));

        PageDto<CommentDto> result = commentService.getComments(100L, 0, 10);

        assertThat(result.content()).extracting(CommentDto::id).containsExactly(200L, 202L);
        assertThat(result.content().get(0).replies()).extracting(CommentDto::likedByMe).containsExactly(true);
        assertThat(result.content().get(1).replies()).isEmpty();
        assertThat(result.content()).allMatch(c -> c.likeCount() == 0L && !c.likedByMe());
        verify(commentRepository, times(1)).findByParentIdInOrderByCreatedAtAsc(any());
        verify(commentLikeRepository, times(1)).countByCommentIds(any());
        verify(commentLikeRepository, times(1)).findLikedCommentIds(any(), any());
        verify(commentLikeRepository, never()).countByCommentId(any());
        verify(commentLikeRepository, never()).existsByCommentIdAndUserId(any(), any());
    }

    @Test
    void getComments_emptyPage_runsNoBatchQueries() {
        when(videoRepository.existsById(100L)).thenReturn(true);
        when(commentRepository.findByVideoIdAndParentIsNullOrderByCreatedAtDesc(eq(100L), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageDto<CommentDto> result = commentService.getComments(100L, 0, 10);

        assertThat(result.content()).isEmpty();
        verifyNoInteractions(commentLikeRepository);
        verify(commentRepository, never()).findByParentIdInOrderByCreatedAtAsc(any());
    }

    private static CommentLikeRepository.CommentLikeCount likeCount(Long commentId, long count) {
        return new CommentLikeRepository.CommentLikeCount() {
            @Override
            public Long getCommentId() {
                return commentId;
            }

            @Override
            public long getLikeCount() {
                return count;
            }
        };
    }

    @Test
    void getComments_authenticatedUser_setsLikedByMeCorrectly() {
        mockAuthentication(user);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(videoRepository.existsById(100L)).thenReturn(true);
        when(commentRepository.findByVideoIdAndParentIsNullOrderByCreatedAtDesc(eq(100L), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(rootComment)));
        when(commentRepository.findByParentIdInOrderByCreatedAtAsc(List.of(200L))).thenReturn(List.of());
        when(commentLikeRepository.countByCommentIds(List.of(200L))).thenReturn(List.of(likeCount(200L, 3L)));
        when(commentLikeRepository.findLikedCommentIds(10L, List.of(200L))).thenReturn(List.of(200L));

        PageDto<CommentDto> result = commentService.getComments(100L, 0, 10);

        assertThat(result.content().get(0).likedByMe()).isTrue();
        assertThat(result.content().get(0).likeCount()).isEqualTo(3L);
    }

    @Test
    void getComments_invalidArguments_throwsExceptions() {
        assertThatThrownBy(() -> commentService.getComments(null, 0, 10))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Video id must not be null");

        when(videoRepository.existsById(999L)).thenReturn(false);
        assertThatThrownBy(() -> commentService.getComments(999L, 0, 10))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Video not found with id 999");

        when(videoRepository.existsById(100L)).thenReturn(true);
        assertThatThrownBy(() -> commentService.getComments(100L, -1, 10))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> commentService.getComments(100L, 0, 0))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> commentService.getComments(100L, 0, 101))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void addComment_authenticatedUser_savesAndReturnsDto() {
        mockAuthentication(user);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(videoRepository.findById(100L)).thenReturn(Optional.of(video));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(300L);
            return c;
        });

        CommentDto result = commentService.addComment(100L, new CommentRequestDto("New comment!"));

        assertThat(result.id()).isEqualTo(300L);
        assertThat(result.text()).isEqualTo("New comment!");
        assertThat(result.author()).isEqualTo("alice");
        assertThat(result.videoId()).isEqualTo(100L);
        assertThat(result.parentId()).isNull();
    }

    @Test
    void addComment_unauthenticated_throwsBadCredentials() {
        when(videoRepository.findById(100L)).thenReturn(Optional.of(video));

        assertThatThrownBy(() -> commentService.addComment(100L, new CommentRequestDto("Hi")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Authentication required");
    }

    @Test
    void addComment_invalidArguments_throwsInvalidRequest() {
        assertThatThrownBy(() -> commentService.addComment(null, new CommentRequestDto("Hi")))
                .isInstanceOf(InvalidRequestException.class);

        assertThatThrownBy(() -> commentService.addComment(100L, null))
                .isInstanceOf(InvalidRequestException.class);

        assertThatThrownBy(() -> commentService.addComment(100L, new CommentRequestDto("   ")))
                .isInstanceOf(InvalidRequestException.class);

        String tooLong = "a".repeat(2001);
        assertThatThrownBy(() -> commentService.addComment(100L, new CommentRequestDto(tooLong)))
                .isInstanceOf(InvalidRequestException.class);

        when(videoRepository.findById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> commentService.addComment(999L, new CommentRequestDto("Hi")))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void addReply_toRootComment_success() {
        mockAuthentication(user);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(commentRepository.findById(200L)).thenReturn(Optional.of(rootComment));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(301L);
            return c;
        });

        CommentDto result = commentService.addReply(200L, new CommentRequestDto("Replying to root"));

        assertThat(result.id()).isEqualTo(301L);
        assertThat(result.text()).isEqualTo("Replying to root");
        assertThat(result.parentId()).isEqualTo(200L);
    }

    @Test
    void addReply_toReplyComment_rejectedByOneNestingLevelRule() {
        when(commentRepository.findById(201L)).thenReturn(Optional.of(replyComment));

        assertThatThrownBy(() -> commentService.addReply(201L, new CommentRequestDto("Nested reply")))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Replies cannot be nested beyond one level");
    }

    @Test
    void addReply_invalidArguments_throwsExceptions() {
        assertThatThrownBy(() -> commentService.addReply(null, new CommentRequestDto("Hi")))
                .isInstanceOf(InvalidRequestException.class);

        when(commentRepository.findById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> commentService.addReply(999L, new CommentRequestDto("Hi")))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void likeComment_idempotent() {
        mockAuthentication(user);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(commentRepository.findById(200L)).thenReturn(Optional.of(rootComment));
        when(commentLikeRepository.findByCommentIdAndUserId(200L, 10L))
                .thenReturn(Optional.empty()) // First call: not liked yet
                .thenReturn(Optional.of(new CommentLike(rootComment, user))); // Second call: already liked
        when(commentLikeRepository.countByCommentId(200L)).thenReturn(1L);

        // First like
        CommentLikeDto firstResult = commentService.likeComment(200L);
        assertThat(firstResult.likedByMe()).isTrue();
        assertThat(firstResult.likeCount()).isEqualTo(1L);
        verify(commentLikeRepository, times(1)).save(any(CommentLike.class));

        // Second like (idempotent)
        CommentLikeDto secondResult = commentService.likeComment(200L);
        assertThat(secondResult.likedByMe()).isTrue();
        assertThat(secondResult.likeCount()).isEqualTo(1L);
        verify(commentLikeRepository, times(1)).save(any(CommentLike.class)); // Not called again
    }

    @Test
    void unlikeComment_idempotent() {
        mockAuthentication(user);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(commentRepository.findById(200L)).thenReturn(Optional.of(rootComment));
        CommentLike existingLike = new CommentLike(rootComment, user);
        when(commentLikeRepository.findByCommentIdAndUserId(200L, 10L))
                .thenReturn(Optional.of(existingLike)) // First call: was liked
                .thenReturn(Optional.empty()); // Second call: already unliked
        when(commentLikeRepository.countByCommentId(200L)).thenReturn(0L);

        // First unlike
        CommentLikeDto firstResult = commentService.unlikeComment(200L);
        assertThat(firstResult.likedByMe()).isFalse();
        assertThat(firstResult.likeCount()).isEqualTo(0L);
        verify(commentLikeRepository, times(1)).delete(existingLike);

        // Second unlike (idempotent)
        CommentLikeDto secondResult = commentService.unlikeComment(200L);
        assertThat(secondResult.likedByMe()).isFalse();
        assertThat(secondResult.likeCount()).isEqualTo(0L);
        verify(commentLikeRepository, times(1)).delete(any()); // Not called again
    }

    @Test
    void likeAndUnlike_invalidOrNotFound_throwsExceptions() {
        assertThatThrownBy(() -> commentService.likeComment(null))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> commentService.unlikeComment(null))
                .isInstanceOf(InvalidRequestException.class);

        when(commentRepository.findById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> commentService.likeComment(999L))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> commentService.unlikeComment(999L))
                .isInstanceOf(NotFoundException.class);
    }
}
