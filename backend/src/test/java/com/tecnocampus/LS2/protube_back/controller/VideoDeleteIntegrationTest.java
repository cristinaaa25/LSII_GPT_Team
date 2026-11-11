package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.domain.*;
import com.tecnocampus.LS2.protube_back.repository.*;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import com.tecnocampus.LS2.protube_back.services.VideoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VideoDeleteIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VideoRepository videoRepository;

    @Autowired
    CommentRepository commentRepository;

    @Autowired
    CommentLikeRepository commentLikeRepository;

    @Autowired
    VideoViewRepository videoViewRepository;

    @Autowired
    VideoLikeRepository videoLikeRepository;

    @Autowired
    VideoService videoService;

    @Autowired
    JwtService jwtService;

    @Autowired
    PlatformTransactionManager transactionManager;

    @Value("${pro_tube.store.dir:target/test-store/}")
    String storeDir;

    private User owner;
    private User other;
    private Video video;

    @BeforeEach
    void setUp() throws IOException {
        cleanDatabase();

        Files.createDirectories(Path.of(storeDir));

        owner = userRepository.save(new User("del_owner", "del_owner@example.com", "pass123"));
        other = userRepository.save(new User("del_other", "del_other@example.com", "pass123"));

        video = new Video("Delete title", "Delete desc", "del.mp4", "del.webp", 15.0, 1920, 1080, owner);
        video.setTags(new ArrayList<>(List.of("tag1", "tag2")));
        video.setCategories(new ArrayList<>(List.of("Cat1")));
        video = videoRepository.save(video);
    }

    @AfterEach
    void tearDown() {
        cleanDatabase();
    }

    private void cleanDatabase() {
        commentLikeRepository.deleteAll();
        commentRepository.deleteAll();
        videoViewRepository.deleteAll();
        videoLikeRepository.deleteAll();
        videoRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void ownerCanDeleteVideoAndReturns204() throws Exception {
        mockMvc.perform(delete("/api/videos/" + video.getId())
                        .header("Authorization", "Bearer " + jwtService.generateToken(owner)))
                .andExpect(status().isNoContent());

        assertThat(videoRepository.findById(video.getId())).isEmpty();
    }

    @Test
    void anotherUserIsForbiddenAndReturns403() throws Exception {
        mockMvc.perform(delete("/api/videos/" + video.getId())
                        .header("Authorization", "Bearer " + jwtService.generateToken(other)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Only the owner can delete this video"));

        assertThat(videoRepository.findById(video.getId())).isPresent();
    }

    @Test
    void anonymousUserIsUnauthorizedAndReturns401() throws Exception {
        mockMvc.perform(delete("/api/videos/" + video.getId()))
                .andExpect(status().isUnauthorized());

        assertThat(videoRepository.findById(video.getId())).isPresent();
    }

    @Test
    void unknownVideoReturns404() throws Exception {
        mockMvc.perform(delete("/api/videos/999999")
                        .header("Authorization", "Bearer " + jwtService.generateToken(owner)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Video not found with id 999999"));
    }

    @Test
    void cascadeDeletesAllDependentEntitiesNoOrphanRows() throws Exception {
        Long videoId = video.getId();

        // 1. Comments and replies
        Comment rootComment = commentRepository.save(new Comment("Great video!", video, other));
        Comment reply = commentRepository.save(new Comment("Thanks!", video, owner, rootComment));
        Long rootCommentId = rootComment.getId();
        Long replyId = reply.getId();

        // 2. Comment likes
        CommentLike commentLike = commentLikeRepository.save(new CommentLike(rootComment, owner));

        // 3. Video likes
        VideoLike videoLike = videoLikeRepository.save(new VideoLike(video, other));

        // 4. Video views
        VideoView videoView = videoViewRepository.save(new VideoView(video, other));

        // Delete the video as owner
        mockMvc.perform(delete("/api/videos/" + videoId)
                        .header("Authorization", "Bearer " + jwtService.generateToken(owner)))
                .andExpect(status().isNoContent());

        // Verify no orphan rows remain
        assertThat(videoRepository.findById(videoId)).isEmpty();
        assertThat(commentRepository.findById(rootCommentId)).isEmpty();
        assertThat(commentRepository.findById(replyId)).isEmpty();
        assertThat(commentRepository.countByVideoId(videoId)).isEqualTo(0);
        assertThat(commentLikeRepository.findByCommentIdAndUserId(rootCommentId, owner.getId())).isEmpty();
        assertThat(videoLikeRepository.findByVideoIdAndUserId(videoId, other.getId())).isEmpty();
        assertThat(videoViewRepository.findByVideoId(videoId)).isEmpty();
    }

    @Test
    void filesRemovedAfterCommitAndKeptIfTransactionFails(@TempDir Path tempDir) throws IOException {
        Path customStore = tempDir.resolve("filestore");
        Files.createDirectories(customStore);

        Path vidFile = customStore.resolve("trans_test.mp4");
        Path thumbFile = customStore.resolve("trans_test.webp");
        Files.writeString(vidFile, "video data");
        Files.writeString(thumbFile, "thumb data");

        VideoService customService = new VideoService(
                videoRepository, commentRepository, videoViewRepository, videoLikeRepository, userRepository, customStore.toString()
        );

        Video txVideo = new Video("Tx Title", "trans_test.mp4", owner);
        txVideo.setThumbnailUrl("trans_test.webp");
        txVideo = videoRepository.save(txVideo);
        Long txVideoId = txVideo.getId();

        // Case 1: Transaction rolls back / fails -> files must NOT be deleted
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        assertThatThrownBy(() -> txTemplate.execute(status -> {
            customService.deleteVideo(txVideoId, "del_owner");
            throw new RuntimeException("Simulated transaction failure");
        })).hasMessage("Simulated transaction failure");

        // Files are KEPT because transaction failed
        assertThat(Files.exists(vidFile)).isTrue();
        assertThat(Files.exists(thumbFile)).isTrue();

        // Case 2: Transaction commits successfully -> files are REMOVED
        txTemplate.execute(status -> {
            customService.deleteVideo(txVideoId, "del_owner");
            return null;
        });

        // Files are removed after commit
        assertThat(Files.exists(vidFile)).isFalse();
        assertThat(Files.exists(thumbFile)).isFalse();
    }
}
