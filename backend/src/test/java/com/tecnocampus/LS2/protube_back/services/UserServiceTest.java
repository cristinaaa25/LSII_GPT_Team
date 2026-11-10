package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.dto.UpdateProfileRequestDto;
import com.tecnocampus.LS2.protube_back.dto.UserDto;
import com.tecnocampus.LS2.protube_back.dto.UserProfileDto;
import com.tecnocampus.LS2.protube_back.dto.VideoSummaryDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.TestImages;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.BadCredentialsException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class UserServiceTest {

    private UserRepository userRepository;
    private VideoRepository videoRepository;
    private UserService userService;
    private Path tempStoreDir;

    @BeforeEach
    void setUp(@TempDir Path tempDir) {
        userRepository = mock(UserRepository.class);
        videoRepository = mock(VideoRepository.class);
        tempStoreDir = tempDir;
        userService = new UserService(userRepository, videoRepository, tempStoreDir.toString() + "/");
    }

    @Test
    void getPublicProfileReturnsUserProfileWithVideos() {
        User user = new User("alice", "alice@example.com", "hash", "Alice In Wonderland", "http://avatar", "Bio of Alice");
        user.setId(10L);

        Video v1 = new Video("Video 1", "Desc 1", "v1.mp4", "t1.webp", 120.0, 1920, 1080, user);
        v1.setId(101L);
        Video v2 = new Video("Video 2", "Desc 2", "v2.mp4", "t2.webp", 60.0, 1920, 1080, user);
        v2.setId(102L);

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(videoRepository.findByUploaderId(eq(10L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(v1, v2)));

        UserProfileDto result = userService.getPublicProfile("alice");

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.username()).isEqualTo("alice");
        assertThat(result.displayName()).isEqualTo("Alice In Wonderland");
        assertThat(result.avatarUrl()).isEqualTo("http://avatar");
        assertThat(result.description()).isEqualTo("Bio of Alice");
        assertThat(result.videos()).hasSize(2);
        assertThat(result.videos().get(0).title()).isEqualTo("Video 1");
    }

    @Test
    void getPublicProfileAsksOnlyForTheFirstPageOfVideos() {
        User user = new User("alice", "alice@example.com", "hash");
        user.setId(10L);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(videoRepository.findByUploaderId(eq(10L), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        userService.getPublicProfile("alice");

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(videoRepository).findByUploaderId(eq(10L), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
        assertThat(pageable.getValue().getPageSize()).isEqualTo(UserService.PROFILE_VIDEOS_SIZE);
        assertThat(pageable.getValue().getSort().getOrderFor("createdAt").isDescending()).isTrue();
    }

    @Test
    void getPublicVideosReturnsRequestedPageNewestFirst() {
        User user = new User("alice", "alice@example.com", "hash");
        user.setId(10L);
        Video v3 = new Video("Video 3", "Desc 3", "v3.mp4", "t3.webp", 30.0, 1920, 1080, user);
        v3.setId(103L);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(videoRepository.findByUploaderId(eq(10L), any(Pageable.class)))
                .thenAnswer(inv -> new PageImpl<>(List.of(v3), inv.getArgument(1), 3));

        PageDto<VideoSummaryDto> page = userService.getPublicVideos("alice", 1, 2);

        assertThat(page.content()).extracting(VideoSummaryDto::id).containsExactly(103L);
        assertThat(page.page()).isEqualTo(1);
        assertThat(page.size()).isEqualTo(2);
        assertThat(page.totalElements()).isEqualTo(3);
        assertThat(page.totalPages()).isEqualTo(2);
        assertThat(page.last()).isTrue();
        verify(videoRepository).findByUploaderId(10L,
                PageRequest.of(1, 2, org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Order.desc("createdAt"),
                        org.springframework.data.domain.Sort.Order.desc("id"))));
    }

    @Test
    void getPublicVideosValidatesArguments() {
        assertThatThrownBy(() -> userService.getPublicVideos(" ", 0, 12))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> userService.getPublicVideos("alice", -1, 12))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> userService.getPublicVideos("alice", 0, 101))
                .isInstanceOf(InvalidRequestException.class);

        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> userService.getPublicVideos("ghost", 0, 12))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void getPublicProfileThrowsWhenUsernameNotFound() {
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getPublicProfile("nonexistent"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("User not found: nonexistent");
    }

    @Test
    void getPublicProfileThrowsWhenUsernameBlankOrNull() {
        assertThatThrownBy(() -> userService.getPublicProfile("   "))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Username must not be empty");

        assertThatThrownBy(() -> userService.getPublicProfile(null))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void getOwnProfileReturnsUserDto() {
        User user = new User("alice", "alice@example.com", "hash", "Alice W", "http://avatar", "Bio");
        user.setId(10L);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        UserDto dto = userService.getOwnProfile("alice");

        assertThat(dto.id()).isEqualTo(10L);
        assertThat(dto.username()).isEqualTo("alice");
        assertThat(dto.email()).isEqualTo("alice@example.com");
        assertThat(dto.displayName()).isEqualTo("Alice W");
    }

    @Test
    void getOwnProfileThrowsWhenUnauthenticated() {
        assertThatThrownBy(() -> userService.getOwnProfile(null))
                .isInstanceOf(BadCredentialsException.class);

        assertThatThrownBy(() -> userService.getOwnProfile(""))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void getOwnProfileThrowsWhenUserNotFound() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getOwnProfile("ghost"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateOwnProfileSavesAndReturnsUpdatedUser() {
        User user = new User("alice", "alice@example.com", "hash", "Old Name", "http://avatar", "Old Bio");
        user.setId(10L);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateProfileRequestDto request = new UpdateProfileRequestDto("New Display Name", "New Description");
        UserDto result = userService.updateOwnProfile("alice", request);

        assertThat(result.displayName()).isEqualTo("New Display Name");
        assertThat(result.description()).isEqualTo("New Description");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getDisplayName()).isEqualTo("New Display Name");
        assertThat(captor.getValue().getDescription()).isEqualTo("New Description");
    }

    @Test
    void updateOwnProfileClearsFieldsWhenBlank() {
        User user = new User("alice", "alice@example.com", "hash", "Old Name", "http://avatar", "Old Bio");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateProfileRequestDto request = new UpdateProfileRequestDto("   ", "");
        UserDto result = userService.updateOwnProfile("alice", request);

        assertThat(result.displayName()).isNull();
        assertThat(result.description()).isNull();
    }

    @Test
    void updateOwnProfileLeavesLengthValidationToBeanValidation() {
        // Max lengths are checked once, by @Size on UpdateProfileRequestDto (see UserControllerTest)
        User user = new User("alice", "alice@example.com", "hash");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserDto result = userService.updateOwnProfile("alice", new UpdateProfileRequestDto("A".repeat(101), "Bio"));

        assertThat(result.displayName()).hasSize(101);
    }

    @Test
    void updateAvatarRejectsFakeImageWithValidTypeAndExtension() {
        User user = new User("alice", "alice@example.com", "hash");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        // A text file named .png and sent as image/png
        MockMultipartFile fake = new MockMultipartFile("avatar", "fake.png", "image/png", "just some text".getBytes());
        assertThatThrownBy(() -> userService.updateAvatar("alice", fake))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("not a valid PNG, JPG or WEBP image");

        // Real JPEG bytes declared as PNG: content and declared type must agree
        MockMultipartFile mismatch = new MockMultipartFile("avatar", "photo.png", "image/png", TestImages.jpeg());
        assertThatThrownBy(() -> userService.updateAvatar("alice", mismatch))
                .isInstanceOf(InvalidRequestException.class);

        verify(userRepository, never()).save(any());
        assertThat(Files.exists(tempStoreDir.resolve("avatars"))).isFalse();
    }

    @Test
    void updateOwnProfileThrowsWhenRequestOrUserInvalid() {
        assertThatThrownBy(() -> userService.updateOwnProfile(null, new UpdateProfileRequestDto("A", "B")))
                .isInstanceOf(BadCredentialsException.class);

        assertThatThrownBy(() -> userService.updateOwnProfile("alice", null))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void updateAvatarSavesFileAndUpdatesUserAvatarUrl() throws IOException {
        User user = new User("alice", "alice@example.com", "hash");
        user.setId(10L);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        byte[] content = TestImages.png();
        MockMultipartFile file = new MockMultipartFile("avatar", "profile.png", "image/png", content);

        UserDto result = userService.updateAvatar("alice", file);

        assertThat(result.avatarUrl()).startsWith("/media/avatars/").endsWith(".png");

        Path avatarsDir = tempStoreDir.resolve("avatars");
        assertThat(Files.isDirectory(avatarsDir)).isTrue();
        String savedFileName = result.avatarUrl().substring("/media/avatars/".length());
        Path savedFile = avatarsDir.resolve(savedFileName);
        assertThat(Files.exists(savedFile)).isTrue();
        assertThat(Files.readAllBytes(savedFile)).isEqualTo(content);
    }

    @Test
    void updateAvatarSupportsWebpAndJpg() {
        User user = new User("alice", "alice@example.com", "hash");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MockMultipartFile webpFile = new MockMultipartFile("avatar", "pic.webp", "image/webp", TestImages.webp());
        UserDto webpResult = userService.updateAvatar("alice", webpFile);
        assertThat(webpResult.avatarUrl()).startsWith("/media/avatars/").endsWith(".webp");

        MockMultipartFile jpgFile = new MockMultipartFile("avatar", "pic.jpg", "image/jpeg", TestImages.jpeg());
        UserDto jpgResult = userService.updateAvatar("alice", jpgFile);
        assertThat(jpgResult.avatarUrl()).startsWith("/media/avatars/").endsWith(".jpg");
    }

    @Test
    void updateAvatarDeletesPreviousAvatarFile() throws IOException {
        Path avatarsDir = tempStoreDir.resolve("avatars");
        Files.createDirectories(avatarsDir);
        Path oldFile = avatarsDir.resolve("old-avatar.png");
        Files.writeString(oldFile, "old-avatar-data");

        User user = new User("alice", "alice@example.com", "hash");
        user.setAvatarUrl("/media/avatars/old-avatar.png");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MockMultipartFile newFile = new MockMultipartFile("avatar", "new.png", "image/png", TestImages.png());
        userService.updateAvatar("alice", newFile);

        assertThat(Files.exists(oldFile)).isFalse();
    }

    @Test
    void updateAvatarKeepsPreviousAvatarAndRemovesNewFileWhenSaveFails() throws IOException {
        Path avatarsDir = tempStoreDir.resolve("avatars");
        Files.createDirectories(avatarsDir);
        Path oldFile = avatarsDir.resolve("old-avatar.png");
        Files.writeString(oldFile, "old-avatar-data");

        User user = new User("alice", "alice@example.com", "hash");
        user.setAvatarUrl("/media/avatars/old-avatar.png");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenThrow(new RuntimeException("Database error"));

        MockMultipartFile newFile = new MockMultipartFile("avatar", "new.png", "image/png", TestImages.png());
        assertThatThrownBy(() -> userService.updateAvatar("alice", newFile))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Database error");

        assertThat(Files.exists(oldFile)).isTrue();
        try (var files = Files.list(avatarsDir)) {
            assertThat(files.toList()).containsExactly(oldFile);
        }
    }

    @Test
    void updateAvatarRejectsEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile("avatar", "empty.png", "image/png", new byte[0]);
        assertThatThrownBy(() -> userService.updateAvatar("alice", emptyFile))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Avatar file is required and must not be empty");

        assertThatThrownBy(() -> userService.updateAvatar("alice", null))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void updateAvatarRejectsOversizedFile() {
        byte[] largeBytes = new byte[(int) (2 * 1024 * 1024 + 1)];
        MockMultipartFile largeFile = new MockMultipartFile("avatar", "big.png", "image/png", largeBytes);

        assertThatThrownBy(() -> userService.updateAvatar("alice", largeFile))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Avatar size must not exceed 2MB");
    }

    @Test
    void updateAvatarRejectsUnsupportedFormats() {
        MockMultipartFile pdfFile = new MockMultipartFile("avatar", "doc.pdf", "application/pdf", "pdf-data".getBytes());
        assertThatThrownBy(() -> userService.updateAvatar("alice", pdfFile))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Invalid image format");

        MockMultipartFile fakePng = new MockMultipartFile("avatar", "bad.gif", "image/gif", "gif-data".getBytes());
        assertThatThrownBy(() -> userService.updateAvatar("alice", fakePng))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Invalid image format");
    }

    @Test
    void updateAvatarThrowsWhenUnauthenticated() {
        MockMultipartFile file = new MockMultipartFile("avatar", "valid.png", "image/png", "bytes".getBytes());
        assertThatThrownBy(() -> userService.updateAvatar(null, file))
                .isInstanceOf(BadCredentialsException.class);
    }
}
