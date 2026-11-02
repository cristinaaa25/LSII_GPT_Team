package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.dto.UpdateProfileRequestDto;
import com.tecnocampus.LS2.protube_back.dto.UserDto;
import com.tecnocampus.LS2.protube_back.dto.UserProfileDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
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
        when(videoRepository.findByUploaderIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(v1, v2));

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
    void updateOwnProfileValidatesMaxLength() {
        User user = new User("alice", "alice@example.com", "hash");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        String longName = "A".repeat(101);
        UpdateProfileRequestDto invalidName = new UpdateProfileRequestDto(longName, "Bio");
        assertThatThrownBy(() -> userService.updateOwnProfile("alice", invalidName))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Display name cannot exceed 100 characters");

        String longDesc = "B".repeat(2001);
        UpdateProfileRequestDto invalidDesc = new UpdateProfileRequestDto("Name", longDesc);
        assertThatThrownBy(() -> userService.updateOwnProfile("alice", invalidDesc))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Description cannot exceed 2000 characters");
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

        byte[] content = "fake-png-bytes".getBytes();
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

        MockMultipartFile webpFile = new MockMultipartFile("avatar", "pic.webp", "image/webp", "webp-bytes".getBytes());
        UserDto webpResult = userService.updateAvatar("alice", webpFile);
        assertThat(webpResult.avatarUrl()).startsWith("/media/avatars/").endsWith(".webp");

        MockMultipartFile jpgFile = new MockMultipartFile("avatar", "pic.jpg", "image/jpeg", "jpg-bytes".getBytes());
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

        MockMultipartFile newFile = new MockMultipartFile("avatar", "new.png", "image/png", "new-bytes".getBytes());
        userService.updateAvatar("alice", newFile);

        assertThat(Files.exists(oldFile)).isFalse();
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
