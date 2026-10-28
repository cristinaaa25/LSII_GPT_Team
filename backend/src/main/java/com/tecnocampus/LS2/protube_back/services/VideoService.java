package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.domain.VideoView;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.dto.VideoDetailDto;
import com.tecnocampus.LS2.protube_back.dto.VideoSummaryDto;
import com.tecnocampus.LS2.protube_back.dto.VideoUpdateRequestDto;
import com.tecnocampus.LS2.protube_back.exception.ForbiddenException;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoViewRepository;
import com.tecnocampus.LS2.protube_back.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class VideoService {

    private static final Logger LOG = LoggerFactory.getLogger(VideoService.class);

    public static final int MAX_PAGE_SIZE = 100;
    public static final long MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final VideoRepository videoRepository;
    private final CommentRepository commentRepository;
    private final VideoViewRepository videoViewRepository;
    private final UserRepository userRepository;
    private final String storeDir;

    @Autowired
    public VideoService(
            VideoRepository videoRepository,
            CommentRepository commentRepository,
            VideoViewRepository videoViewRepository,
            UserRepository userRepository,
            @Value("${pro_tube.store.dir:target/test-store/}") String storeDir) {
        this.videoRepository = videoRepository;
        this.commentRepository = commentRepository;
        this.videoViewRepository = videoViewRepository;
        this.userRepository = userRepository;
        this.storeDir = storeDir != null ? storeDir : "target/test-store/";
    }

    public VideoService(
            VideoRepository videoRepository,
            CommentRepository commentRepository,
            VideoViewRepository videoViewRepository,
            UserRepository userRepository) {
        this(videoRepository, commentRepository, videoViewRepository, userRepository, "target/test-store/");
    }

    @Transactional(readOnly = true)
    public PageDto<VideoSummaryDto> getVideos(int page, int size) {
        validatePage(page, size);
        return PageDto.from(videoRepository.findAllBy(PageRequest.of(page, size, NEWEST_FIRST))
                .map(VideoService::toSummary));
    }

    /** Ranked search over title, tags and description; a blank query returns the whole catalog. */
    @Transactional(readOnly = true)
    public PageDto<VideoSummaryDto> searchVideos(String query, int page, int size) {
        validatePage(page, size);
        if (query == null || query.isBlank()) {
            return getVideos(page, size);
        }
        // The query already orders by relevance, so the page request must stay unsorted
        return PageDto.from(videoRepository.search(toLikePattern(query), PageRequest.of(page, size))
                .map(VideoService::toSummary));
    }

    /** Lower-cases the query, escapes LIKE wildcards so they match literally and wraps it in {@code %}. */
    static String toLikePattern(String query) {
        String escaped = query.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }

    private static void validatePage(int page, int size) {
        if (page < 0) {
            throw new InvalidRequestException("page must be greater than or equal to 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidRequestException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
    }

    @Transactional(readOnly = true)
    public VideoDetailDto getVideo(Long id) {
        if (id == null) {
            throw new InvalidRequestException("Video id must not be null");
        }
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Video not found with id " + id));
        long commentCount = commentRepository.countByVideoId(id);
        return toDetail(video, commentCount);
    }

    @Transactional
    public VideoDetailDto uploadVideo(
            MultipartFile file,
            String title,
            String description,
            List<String> tags,
            List<String> categories,
            MultipartFile thumbnail,
            String username) {
        if (username == null || username.isBlank()) {
            throw new BadCredentialsException("Authentication required");
        }
        User uploader = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("User not found: " + username));

        if (file == null || file.isEmpty()) {
            throw new InvalidRequestException("Video file is required");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new MaxUploadSizeExceededException(MAX_FILE_SIZE);
        }

        String contentType = file.getContentType();
        String filename = file.getOriginalFilename();
        boolean isMp4ContentType = "video/mp4".equalsIgnoreCase(contentType);
        boolean isMp4Extension = filename != null && filename.toLowerCase(Locale.ROOT).endsWith(".mp4");
        if (!isMp4ContentType || !isMp4Extension) {
            throw new InvalidRequestException("Only video/mp4 files are supported");
        }

        if (title == null || title.isBlank()) {
            throw new InvalidRequestException("Title is required");
        }
        if (title.trim().length() > 255) {
            throw new InvalidRequestException("Title must not exceed 255 characters");
        }
        if (description == null || description.isBlank()) {
            throw new InvalidRequestException("Description is required");
        }

        String thumbExt = ".webp";
        if (thumbnail != null && !thumbnail.isEmpty()) {
            String thumbContentType = thumbnail.getContentType();
            if (thumbContentType == null || !thumbContentType.startsWith("image/")) {
                throw new InvalidRequestException("Thumbnail must be an image file");
            }
            String originalThumb = thumbnail.getOriginalFilename();
            if (originalThumb != null && originalThumb.contains(".")) {
                thumbExt = originalThumb.substring(originalThumb.lastIndexOf(".")).toLowerCase(Locale.ROOT);
            }
        }

        List<String> cleanTags = parseList(tags);
        List<String> cleanCategories = parseList(categories);

        Path tempVideo = null;
        Path tempThumb = null;
        Path targetVideo = null;
        Path targetThumb = null;

        try {
            tempVideo = Files.createTempFile("protube-upload-", ".mp4");
            file.transferTo(tempVideo);

            if (thumbnail != null && !thumbnail.isEmpty()) {
                tempThumb = Files.createTempFile("protube-thumb-", thumbExt);
                thumbnail.transferTo(tempThumb);
            } else {
                tempThumb = generateThumbnailWithFfmpeg(tempVideo);
            }

            VideoProbe probe = probeVideo(tempVideo);

            Path storeDirPath = Path.of(storeDir);
            Files.createDirectories(storeDirPath);

            String newId = UUID.randomUUID().toString();
            String videoFileName = newId + ".mp4";
            targetVideo = storeDirPath.resolve(videoFileName);

            String thumbFileName = null;
            if (tempThumb != null && Files.exists(tempThumb)) {
                thumbFileName = newId + thumbExt;
                targetThumb = storeDirPath.resolve(thumbFileName);
            }

            Files.move(tempVideo, targetVideo, StandardCopyOption.REPLACE_EXISTING);
            tempVideo = null;

            if (tempThumb != null && targetThumb != null) {
                Files.move(tempThumb, targetThumb, StandardCopyOption.REPLACE_EXISTING);
                tempThumb = null;
            }

            Video video = new Video(
                    title.trim(),
                    description.trim(),
                    videoFileName,
                    thumbFileName,
                    probe.duration(),
                    probe.width(),
                    probe.height(),
                    uploader
            );
            video.setTags(cleanTags);
            video.setCategories(cleanCategories);

            Video saved = videoRepository.save(video);
            return toDetail(saved, 0L);

        } catch (Exception e) {
            if (targetVideo != null) {
                try {
                    Files.deleteIfExists(targetVideo);
                } catch (IOException ignored) {}
            }
            if (targetThumb != null) {
                try {
                    Files.deleteIfExists(targetThumb);
                } catch (IOException ignored) {}
            }
            if (e instanceof InvalidRequestException ire) {
                throw ire;
            }
            if (e instanceof BadCredentialsException bce) {
                throw bce;
            }
            if (e instanceof MaxUploadSizeExceededException musee) {
                throw musee;
            }
            throw new RuntimeException("Failed to upload video: " + e.getMessage(), e);
        } finally {
            if (tempVideo != null) {
                try {
                    Files.deleteIfExists(tempVideo);
                } catch (IOException ignored) {}
            }
            if (tempThumb != null) {
                try {
                    Files.deleteIfExists(tempThumb);
                } catch (IOException ignored) {}
            }
        }
    }

    Path generateThumbnailWithFfmpeg(Path videoPath) {
        Path tempThumb = null;
        try {
            tempThumb = Files.createTempFile("protube-thumb-", ".webp");
            boolean success = runFfmpegFrameExtract(videoPath, tempThumb, "00:00:01");
            if (!success) {
                success = runFfmpegFrameExtract(videoPath, tempThumb, "00:00:00");
            }
            if (success && Files.exists(tempThumb) && Files.size(tempThumb) > 0) {
                return tempThumb;
            }
            Files.deleteIfExists(tempThumb);
        } catch (Exception e) {
            LOG.warn("Thumbnail generation with ffmpeg skipped or failed: {}", e.getMessage());
            if (tempThumb != null) {
                try {
                    Files.deleteIfExists(tempThumb);
                } catch (IOException ignored) {}
            }
        }
        return null;
    }

    private boolean runFfmpegFrameExtract(Path videoPath, Path outputPath, String timestamp) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "ffmpeg", "-y", "-ss", timestamp,
                    "-i", videoPath.toAbsolutePath().toString(),
                    "-vframes", "1",
                    outputPath.toAbsolutePath().toString()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            boolean finished = process.waitFor(10, TimeUnit.SECONDS);
            return finished && process.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    VideoProbe probeVideo(Path videoPath) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "ffprobe", "-v", "error",
                    "-show_entries", "stream=width,height:format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    videoPath.toAbsolutePath().toString()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            boolean finished = process.waitFor(10, TimeUnit.SECONDS);
            if (finished && process.exitValue() == 0) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    List<String> lines = reader.lines().filter(s -> !s.isBlank()).toList();
                    Integer width = null;
                    Integer height = null;
                    Double duration = null;
                    if (!lines.isEmpty()) {
                        try {
                            width = Integer.parseInt(lines.get(0).trim());
                        } catch (NumberFormatException ignored) {}
                    }
                    if (lines.size() > 1) {
                        try {
                            height = Integer.parseInt(lines.get(1).trim());
                        } catch (NumberFormatException ignored) {}
                    }
                    if (lines.size() > 2) {
                        try {
                            duration = Double.parseDouble(lines.get(2).trim());
                        } catch (NumberFormatException ignored) {}
                    }
                    return new VideoProbe(duration, width, height);
                }
            }
        } catch (Exception e) {
            LOG.debug("ffprobe not available or probe failed: {}", e.getMessage());
        }
        return new VideoProbe(null, null, null);
    }

    record VideoProbe(Double duration, Integer width, Integer height) {}

    private static List<String> parseList(List<String> values) {
        if (values == null) {
            return new ArrayList<>();
        }
        List<String> result = new ArrayList<>();
        for (String val : values) {
            if (val != null) {
                for (String part : val.split(",")) {
                    String trimmed = part.trim();
                    if (!trimmed.isEmpty()) {
                        if (trimmed.length() > 255) {
                            trimmed = trimmed.substring(0, 255);
                        }
                        if (!result.contains(trimmed)) {
                            result.add(trimmed);
                        }
                    }
                }
            }
        }
        return result;
    }

    /** Replaces title, description, tags and categories. Only the uploader may edit (404 before 403). */
    @Transactional
    public VideoDetailDto updateVideo(Long id, VideoUpdateRequestDto request, String username) {
        if (id == null) {
            throw new InvalidRequestException("Video id must not be null");
        }
        if (username == null || username.isBlank()) {
            throw new BadCredentialsException("Authentication required");
        }
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Video not found with id " + id));
        if (video.getUploader() == null || !username.equals(video.getUploader().getUsername())) {
            throw new ForbiddenException("Only the owner can edit this video");
        }

        video.setTitle(request.title().trim());
        video.setDescription(request.description().trim());
        // Mutate the managed collections so Hibernate rewrites the rows instead of replacing the proxies
        video.getTags().clear();
        video.getTags().addAll(normalizeLabels(request.tags()));
        video.getCategories().clear();
        video.getCategories().addAll(normalizeLabels(request.categories()));

        Video saved = videoRepository.save(video);
        return toDetail(saved, commentRepository.countByVideoId(id));
    }

    /** Trims each label and drops case-insensitive duplicates, keeping the first spelling and the order. */
    static List<String> normalizeLabels(List<String> labels) {
        Map<String, String> unique = new LinkedHashMap<>();
        for (String label : labels) {
            String trimmed = label.trim();
            unique.putIfAbsent(trimmed.toLowerCase(Locale.ROOT), trimmed);
        }
        return new ArrayList<>(unique.values());
    }

    @Transactional
    public void registerView(Long id) {
        if (id == null) {
            throw new InvalidRequestException("Video id must not be null");
        }
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Video not found with id " + id));

        User viewer = findCurrentAuthenticatedUser();
        VideoView view = viewer != null ? new VideoView(video, viewer) : new VideoView(video);
        videoViewRepository.save(view);
        video.setViewCount(video.getViewCount() + 1);
        videoRepository.save(video);
    }

    private User findCurrentAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        if (auth.getPrincipal() instanceof UserPrincipal principal) {
            return userRepository.findById(principal.getId()).orElse(null);
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    static VideoSummaryDto toSummary(Video video) {
        return new VideoSummaryDto(
                video.getId(),
                video.getTitle(),
                video.getUploader().getUsername(),
                video.getDuration(),
                video.getViewCount(),
                video.getThumbnailUrl());
    }

    static VideoDetailDto toDetail(Video video, long commentCount) {
        return new VideoDetailDto(
                video.getId(),
                video.getTitle(),
                video.getDescription(),
                video.getTags() != null ? new ArrayList<>(video.getTags()) : List.of(),
                video.getCategories() != null ? new ArrayList<>(video.getCategories()) : List.of(),
                video.getUploader() != null ? video.getUploader().getUsername() : null,
                video.getCreatedAt(),
                video.getViewCount(),
                video.getLikeCount(),
                commentCount,
                video.getVideoUrl(),
                video.getThumbnailUrl());
    }
}
