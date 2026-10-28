package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.dto.VideoDetailDto;
import com.tecnocampus.LS2.protube_back.dto.VideoSummaryDto;
import com.tecnocampus.LS2.protube_back.dto.VideoUpdateRequestDto;
import com.tecnocampus.LS2.protube_back.services.VideoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/videos")
public class VideosController {

    private final VideoService videoService;

    public VideosController(VideoService videoService) {
        this.videoService = videoService;
    }

    @GetMapping("")
    public ResponseEntity<PageDto<VideoSummaryDto>> getVideos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(videoService.getVideos(page, size));
    }

    @GetMapping("/search")
    public ResponseEntity<PageDto<VideoSummaryDto>> searchVideos(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(videoService.searchVideos(q, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VideoDetailDto> getVideo(@PathVariable Long id) {
        return ResponseEntity.ok(videoService.getVideo(id));
    }

    @PostMapping("/{id}/views")
    public ResponseEntity<Void> registerView(@PathVariable Long id) {
        videoService.registerView(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VideoDetailDto> uploadVideo(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "tags", required = false) List<String> tags,
            @RequestParam(value = "category", required = false) List<String> category,
            @RequestParam(value = "thumbnail", required = false) MultipartFile thumbnail,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        VideoDetailDto created = videoService.uploadVideo(
                file, title, description, tags, category, thumbnail, principal.getName()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VideoDetailDto> updateVideo(
            @PathVariable Long id,
            @Valid @RequestBody VideoUpdateRequestDto request,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(videoService.updateVideo(id, request, principal.getName()));
    }
}
