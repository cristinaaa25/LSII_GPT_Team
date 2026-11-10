package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.dto.UpdateProfileRequestDto;
import com.tecnocampus.LS2.protube_back.dto.UserDto;
import com.tecnocampus.LS2.protube_back.dto.UserProfileDto;
import com.tecnocampus.LS2.protube_back.dto.VideoSummaryDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class UserService {

    private static final Logger LOG = LoggerFactory.getLogger(UserService.class);

    public static final int PROFILE_VIDEOS_SIZE = 12;
    public static final long MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/webp"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".png",
            ".jpg",
            ".jpeg",
            ".webp"
    );

    private final UserRepository userRepository;
    private final VideoRepository videoRepository;
    private final String storeDir;

    @Autowired
    public UserService(
            UserRepository userRepository,
            VideoRepository videoRepository,
            @Value("${pro_tube.store.dir:target/test-store/}") String storeDir) {
        this.userRepository = userRepository;
        this.videoRepository = videoRepository;
        this.storeDir = storeDir != null ? storeDir : "target/test-store/";
    }

    @Transactional(readOnly = true)
    public UserProfileDto getPublicProfile(String username) {
        if (username == null || username.isBlank()) {
            throw new InvalidRequestException("Username must not be empty");
        }
        User user = userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new NotFoundException("User not found: " + username.trim()));

        // Only the newest videos; the rest are loaded page by page from GET /api/users/{username}/videos
        List<VideoSummaryDto> videoDtos = videoRepository
                .findByUploaderId(user.getId(), PageRequest.of(0, PROFILE_VIDEOS_SIZE, VideoService.NEWEST_FIRST))
                .map(VideoService::toSummary)
                .getContent();

        return new UserProfileDto(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getDescription(),
                videoDtos
        );
    }

    /** One page of the videos uploaded by {@code username}, newest first (same shape as {@code /api/videos}). */
    @Transactional(readOnly = true)
    public PageDto<VideoSummaryDto> getPublicVideos(String username, int page, int size) {
        if (username == null || username.isBlank()) {
            throw new InvalidRequestException("Username must not be empty");
        }
        VideoService.validatePage(page, size);
        User user = userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new NotFoundException("User not found: " + username.trim()));

        return PageDto.from(videoRepository
                .findByUploaderId(user.getId(), PageRequest.of(page, size, VideoService.NEWEST_FIRST))
                .map(VideoService::toSummary));
    }

    @Transactional(readOnly = true)
    public UserDto getOwnProfile(String username) {
        if (username == null || username.isBlank()) {
            throw new BadCredentialsException("Authentication required");
        }
        User user = userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new NotFoundException("User not found: " + username.trim()));

        return toDto(user);
    }

    public UserDto updateOwnProfile(String username, UpdateProfileRequestDto request) {
        if (username == null || username.isBlank()) {
            throw new BadCredentialsException("Authentication required");
        }
        if (request == null) {
            throw new InvalidRequestException("Profile update data must not be null");
        }

        User user = userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new NotFoundException("User not found: " + username.trim()));

        // Lengths are validated once, by bean validation on UpdateProfileRequestDto (@Valid in UserController)
        if (request.displayName() != null) {
            String trimmed = request.displayName().trim();
            user.setDisplayName(trimmed.isEmpty() ? null : trimmed);
        }

        if (request.description() != null) {
            String trimmed = request.description().trim();
            user.setDescription(trimmed.isEmpty() ? null : trimmed);
        }

        User saved = userRepository.save(user);
        return toDto(saved);
    }

    public UserDto updateAvatar(String username, MultipartFile file) {
        if (username == null || username.isBlank()) {
            throw new BadCredentialsException("Authentication required");
        }
        if (file == null || file.isEmpty()) {
            throw new InvalidRequestException("Avatar file is required and must not be empty");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new InvalidRequestException("Avatar size must not exceed 2MB");
        }

        String extension = resolveExtension(file);
        // Content type and name come from the client: the file's own bytes must match the format too
        ImageSignature.requireMatches(file, ".png".equals(extension) ? "image/png"
                : ".webp".equals(extension) ? "image/webp" : "image/jpeg");

        User user = userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new NotFoundException("User not found: " + username.trim()));

        Path avatarsDir = Path.of(storeDir).resolve("avatars");
        try {
            Files.createDirectories(avatarsDir);
            String fileName = UUID.randomUUID().toString() + extension;
            Path targetPath = avatarsDir.resolve(fileName);

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String oldAvatarUrl = user.getAvatarUrl();
            user.setAvatarUrl("/media/avatars/" + fileName);
            User saved;
            try {
                saved = userRepository.save(user);
            } catch (RuntimeException e) {
                // Keep the previous avatar and do not leave the new file orphaned
                Files.deleteIfExists(targetPath);
                throw e;
            }

            // Only once the new avatar is saved, clean up the previous one if stored locally
            if (oldAvatarUrl != null && oldAvatarUrl.startsWith("/media/avatars/")) {
                String oldFileName = oldAvatarUrl.substring("/media/avatars/".length());
                try {
                    Files.deleteIfExists(avatarsDir.resolve(oldFileName));
                } catch (IOException e) {
                    LOG.warn("Could not delete old avatar {}: {}", oldFileName, e.getMessage());
                }
            }
            return toDto(saved);
        } catch (IOException e) {
            throw new RuntimeException("Failed to save avatar file: " + e.getMessage(), e);
        }
    }

    private String resolveExtension(MultipartFile file) {
        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        String ext = null;

        if (originalFilename != null && originalFilename.lastIndexOf('.') != -1) {
            String candidate = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
            if (ALLOWED_EXTENSIONS.contains(candidate)) {
                ext = candidate;
            } else {
                throw new InvalidRequestException("Invalid image format. Allowed formats: PNG, JPG, WEBP");
            }
        }

        if (contentType != null && !contentType.isBlank()) {
            String lower = contentType.toLowerCase();
            if (!ALLOWED_CONTENT_TYPES.contains(lower)) {
                throw new InvalidRequestException("Invalid image format. Allowed formats: PNG, JPG, WEBP");
            }
            if (ext == null) {
                if (lower.equals("image/png")) ext = ".png";
                else if (lower.equals("image/webp")) ext = ".webp";
                else ext = ".jpg";
            }
        }

        if (ext == null) {
            throw new InvalidRequestException("Invalid image format. Allowed formats: PNG, JPG, WEBP");
        }
        return ext;
    }

    public UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getDescription()
        );
    }
}
