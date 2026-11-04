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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class CommentService {

    public static final int MAX_PAGE_SIZE = 100;
    public static final int MAX_COMMENT_LENGTH = 2000;

    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;

    public CommentService(
            CommentRepository commentRepository,
            CommentLikeRepository commentLikeRepository,
            VideoRepository videoRepository,
            UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PageDto<CommentDto> getComments(Long videoId, int page, int size) {
        if (videoId == null) {
            throw new InvalidRequestException("Video id must not be null");
        }
        if (!videoRepository.existsById(videoId)) {
            throw new NotFoundException("Video not found with id " + videoId);
        }
        validatePage(page, size);

        User currentUser = findCurrentAuthenticatedUser();
        Long currentUserId = currentUser != null ? currentUser.getId() : null;

        Page<Comment> rootPage = commentRepository.findByVideoIdAndParentIsNullOrderByCreatedAtDesc(
                videoId, PageRequest.of(page, size));

        List<CommentDto> dtos = rootPage.getContent().stream()
                .map(root -> {
                    List<Comment> replies = commentRepository.findByParentIdOrderByCreatedAtAsc(root.getId());
                    List<CommentDto> replyDtos = replies.stream()
                            .map(r -> toDto(r, currentUserId, Collections.emptyList()))
                            .toList();
                    return toDto(root, currentUserId, replyDtos);
                })
                .toList();

        return new PageDto<>(
                dtos,
                rootPage.getNumber(),
                rootPage.getSize(),
                rootPage.getTotalElements(),
                rootPage.getTotalPages(),
                rootPage.isLast()
        );
    }

    @Transactional
    public CommentDto addComment(Long videoId, CommentRequestDto request) {
        if (videoId == null) {
            throw new InvalidRequestException("Video id must not be null");
        }
        validateRequest(request);

        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new NotFoundException("Video not found with id " + videoId));

        User currentUser = requireCurrentAuthenticatedUser();
        Comment comment = new Comment(request.text().trim(), video, currentUser);
        Comment saved = commentRepository.save(comment);

        return toDto(saved, currentUser.getId(), Collections.emptyList());
    }

    @Transactional
    public CommentDto addReply(Long commentId, CommentRequestDto request) {
        if (commentId == null) {
            throw new InvalidRequestException("Comment id must not be null");
        }
        validateRequest(request);

        Comment parent = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found with id " + commentId));

        if (parent.getParent() != null) {
            throw new InvalidRequestException("Replies cannot be nested beyond one level");
        }

        User currentUser = requireCurrentAuthenticatedUser();
        Comment reply = new Comment(request.text().trim(), parent.getVideo(), currentUser, parent);
        Comment saved = commentRepository.save(reply);

        return toDto(saved, currentUser.getId(), Collections.emptyList());
    }

    @Transactional
    public CommentLikeDto likeComment(Long commentId) {
        if (commentId == null) {
            throw new InvalidRequestException("Comment id must not be null");
        }
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found with id " + commentId));

        User currentUser = requireCurrentAuthenticatedUser();
        Optional<CommentLike> existing = commentLikeRepository.findByCommentIdAndUserId(comment.getId(), currentUser.getId());
        if (existing.isEmpty()) {
            commentLikeRepository.save(new CommentLike(comment, currentUser));
        }

        long likeCount = commentLikeRepository.countByCommentId(comment.getId());
        return new CommentLikeDto(comment.getId(), likeCount, true);
    }

    @Transactional
    public CommentLikeDto unlikeComment(Long commentId) {
        if (commentId == null) {
            throw new InvalidRequestException("Comment id must not be null");
        }
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found with id " + commentId));

        User currentUser = requireCurrentAuthenticatedUser();
        Optional<CommentLike> existing = commentLikeRepository.findByCommentIdAndUserId(comment.getId(), currentUser.getId());
        existing.ifPresent(commentLikeRepository::delete);

        long likeCount = commentLikeRepository.countByCommentId(comment.getId());
        return new CommentLikeDto(comment.getId(), likeCount, false);
    }

    private void validatePage(int page, int size) {
        if (page < 0) {
            throw new InvalidRequestException("page must be greater than or equal to 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidRequestException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
    }

    private void validateRequest(CommentRequestDto request) {
        if (request == null || request.text() == null || request.text().trim().isEmpty()) {
            throw new InvalidRequestException("Comment text must not be empty");
        }
        if (request.text().length() > MAX_COMMENT_LENGTH) {
            throw new InvalidRequestException("Comment must not exceed " + MAX_COMMENT_LENGTH + " characters");
        }
    }

    User findCurrentAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        if (auth.getPrincipal() instanceof UserPrincipal principal) {
            return userRepository.findById(principal.getId()).orElse(null);
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    User requireCurrentAuthenticatedUser() {
        User user = findCurrentAuthenticatedUser();
        if (user == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return user;
    }

    private CommentDto toDto(Comment comment, Long currentUserId, List<CommentDto> replies) {
        long likeCount = commentLikeRepository.countByCommentId(comment.getId());
        boolean likedByMe = currentUserId != null && commentLikeRepository.existsByCommentIdAndUserId(comment.getId(), currentUserId);
        String authorName = comment.getAuthor() != null ? comment.getAuthor().getUsername() : "unknown";
        Long parentId = comment.getParent() != null ? comment.getParent().getId() : null;
        Long videoId = comment.getVideo() != null ? comment.getVideo().getId() : null;

        return new CommentDto(
                comment.getId(),
                videoId,
                comment.getText(),
                authorName,
                comment.getCreatedAt(),
                likeCount,
                likedByMe,
                parentId,
                replies
        );
    }
}
