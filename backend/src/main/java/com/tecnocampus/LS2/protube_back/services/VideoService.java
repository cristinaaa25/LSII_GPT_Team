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

import java.io.IOException;
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
    // Same limits as VideoUpdateRequestDto, so an uploaded video can always be saved again from the editor
    public static final int MAX_DESCRIPTION_LENGTH = 5000;
    public static final int MAX_TAGS = 20;
    public static final int MAX_TAG_LENGTH = 50;
    public static final int MAX_CATEGORIES = 5;
    public static final int MAX_CATEGORY_LENGTH = 100;
    private static final long FFMPEG_TIMEOUT_SECONDS = 10;

    // Raster formats only: an SVG served from /media could run scripts on our origin
    private static final Map<String, String> THUMBNAIL_EXTENSIONS = Map.of(
            "image/png", ".png",
            "image/jpeg", ".jpg",
            "image/webp", ".webp");

    static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

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
        String escaped = escapeLike(query);
        return PageDto.from(videoRepository.search(toLikePattern(query), escaped + "%", "% " + escaped + "%",
                        PageRequest.of(page, size))
                .map(VideoService::toSummary));
    }

    /** Lower-cases the query, escapes LIKE wildcards so they match literally and wraps it in {@code %}. */
    static String toLikePattern(String query) {
        return "%" + escapeLike(query) + "%";
    }

    /** Trims and lower-cases the query and escapes {@code \}, {@code %} and {@code _} with a backslash. */
    static String escapeLike(String query) {
        return query.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }

    static void validatePage(int page, int size) {
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
        if (description.trim().length() > MAX_DESCRIPTION_LENGTH) {
            throw new InvalidRequestException("Description must not exceed " + MAX_DESCRIPTION_LENGTH + " characters");
        }

        String thumbExt = ".webp";
        if (thumbnail != null && !thumbnail.isEmpty()) {
            String thumbContentType = thumbnail.getContentType();
            String allowedExt = thumbContentType == null
                    ? null
                    : THUMBNAIL_EXTENSIONS.get(thumbContentType.toLowerCase(Locale.ROOT));
            if (allowedExt == null) {
                throw new InvalidRequestException("Thumbnail must be a PNG, JPG or WEBP image");
            }
            ImageSignature.requireMatches(thumbnail, thumbContentType);
            // Taken from the validated type, never from the user's file name
            thumbExt = allowedExt;
        }

        List<String> cleanTags = normalizeLabels(splitCommaSeparated(tags));
        List<String> cleanCategories = normalizeLabels(splitCommaSeparated(categories));
        validateLabels(cleanTags, MAX_TAGS, MAX_TAG_LENGTH, "tags");
        validateLabels(cleanCategories, MAX_CATEGORIES, MAX_CATEGORY_LENGTH, "categories");

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
        List<String> command = List.of(
                "ffmpeg", "-y", "-ss", timestamp,
                "-i", videoPath.toAbsolutePath().toString(),
                "-vframes", "1",
                outputPath.toAbsolutePath().toString());
        return runTool(command, null);
    }

    VideoProbe probeVideo(Path videoPath) {
        Path output = null;
        try {
            output = Files.createTempFile("protube-probe-", ".txt");
            List<String> command = List.of(
                    "ffprobe", "-v", "error",
                    "-select_streams", "v:0",
                    "-show_entries", "stream=width,height:format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    videoPath.toAbsolutePath().toString());
            if (runTool(command, output)) {
                List<String> lines = Files.readAllLines(output).stream().filter(s -> !s.isBlank()).toList();
                return new VideoProbe(
                        lines.size() > 2 ? parseDouble(lines.get(2)) : null,
                        !lines.isEmpty() ? parseInteger(lines.get(0)) : null,
                        lines.size() > 1 ? parseInteger(lines.get(1)) : null);
            }
        } catch (IOException e) {
            LOG.warn("Could not read ffprobe output: {}", e.getMessage());
        } finally {
            deleteQuietly(output);
        }
        return new VideoProbe(null, null, null);
    }

    /**
     * Runs ffmpeg/ffprobe with a timeout. Output goes to a file (or is discarded) so a full pipe can never block
     * the process, and a process that does not finish in time is killed.
     */
    private boolean runTool(List<String> command, Path stdout) {
        Process process = null;
        try {
            ProcessBuilder pb = new ProcessBuilder(command)
                    .redirectError(ProcessBuilder.Redirect.DISCARD)
                    .redirectOutput(stdout != null
                            ? ProcessBuilder.Redirect.to(stdout.toFile())
                            : ProcessBuilder.Redirect.DISCARD);
            process = pb.start();
            if (!process.waitFor(FFMPEG_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                LOG.warn("{} did not finish in {} s and was killed", command.get(0), FFMPEG_TIMEOUT_SECONDS);
                return false;
            }
            return process.exitValue() == 0;
        } catch (IOException e) {
            // Typically "Cannot run program": without ffmpeg uploads have no thumbnail, duration or resolution
            LOG.warn("{} is not available, skipping: {}", command.get(0), e.getMessage());
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
        }
    }

    private static Integer parseInteger(String value) {
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Double parseDouble(String value) {
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // Best effort: it is only a temporary file
        }
    }

    record VideoProbe(Double duration, Integer width, Integer height) {}

    /** Splits form values like {@code "a, b"} into separate entries; blanks are dropped. */
    private static List<String> splitCommaSeparated(List<String> values) {
        List<String> result = new ArrayList<>();
        if (values == null) {
            return result;
        }
        for (String value : values) {
            if (value == null) {
                continue;
            }
            for (String part : value.split(",")) {
                if (!part.isBlank()) {
                    result.add(part);
                }
            }
        }
        return result;
    }

    private static void validateLabels(List<String> labels, int maxCount, int maxLength, String name) {
        if (labels.size() > maxCount) {
            throw new InvalidRequestException("A video can have at most " + maxCount + " " + name);
        }
        for (String label : labels) {
            if (label.length() > maxLength) {
                throw new InvalidRequestException(
                        "Each of the " + name + " must not exceed " + maxLength + " characters");
            }
        }
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

    public static VideoSummaryDto toSummary(Video video) {
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

