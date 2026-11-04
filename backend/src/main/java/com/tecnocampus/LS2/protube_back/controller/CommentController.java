package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.CommentDto;
import com.tecnocampus.LS2.protube_back.dto.CommentLikeDto;
import com.tecnocampus.LS2.protube_back.dto.CommentRequestDto;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.services.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/videos/{videoId}/comments")
    public ResponseEntity<PageDto<CommentDto>> getComments(
            @PathVariable Long videoId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(commentService.getComments(videoId, page, size));
    }

    @PostMapping("/videos/{videoId}/comments")
    public ResponseEntity<CommentDto> addComment(
            @PathVariable Long videoId,
            @Valid @RequestBody CommentRequestDto request) {
        CommentDto created = commentService.addComment(videoId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/comments/{id}/replies")
    public ResponseEntity<CommentDto> addReply(
            @PathVariable Long id,
            @Valid @RequestBody CommentRequestDto request) {
        CommentDto created = commentService.addReply(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/comments/{id}/like")
    public ResponseEntity<CommentLikeDto> likeComment(@PathVariable Long id) {
        return ResponseEntity.ok(commentService.likeComment(id));
    }

    @DeleteMapping("/comments/{id}/like")
    public ResponseEntity<CommentLikeDto> unlikeComment(@PathVariable Long id) {
        return ResponseEntity.ok(commentService.unlikeComment(id));
    }
}
