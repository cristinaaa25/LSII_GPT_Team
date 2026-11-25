package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Playlist;
import com.tecnocampus.LS2.protube_back.domain.PlaylistVideo;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.dto.PlaylistVideoDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** V8 constraints and custom queries of {@link PlaylistRepository} and {@link PlaylistVideoRepository}. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class PlaylistRepositoryTest {

    @Autowired
    PlaylistRepository playlistRepository;

    @Autowired
    PlaylistVideoRepository playlistVideoRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    VideoRepository videoRepository;

    @Autowired
    JdbcTemplate jdbcTemplate;

    private User alice;
    private User bob;
    private Video videoA;
    private Video videoB;

    @BeforeEach
    void setUp() {
        alice = userRepository.save(new User("pl_alice", "pl_alice@example.com", "pass"));
        bob = userRepository.save(new User("pl_bob", "pl_bob@example.com", "pass"));
        videoA = videoRepository.save(new Video("Video A", "a.mp4", alice));
        videoB = videoRepository.save(new Video("Video B", "b.mp4", bob));
        userRepository.flush();
        videoRepository.flush();
    }

    @Test
    void playlistOwnerAndNamePairIsUniquePerOwner() {
        playlistRepository.saveAndFlush(new Playlist(alice, "Favorites"));
        playlistRepository.saveAndFlush(new Playlist(bob, "Favorites"));

        assertThatThrownBy(() -> playlistRepository.saveAndFlush(new Playlist(alice, "Favorites")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void playlistVideoPairIsUnique() {
        Playlist playlist = playlistRepository.saveAndFlush(new Playlist(alice, "Queue"));
        jdbcTemplate.update("INSERT INTO playlist_videos (playlist_id, video_id) VALUES (?, ?)",
                playlist.getId(), videoA.getId());

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO playlist_videos (playlist_id, video_id) VALUES (?, ?)",
                playlist.getId(), videoA.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingOwnerPlaylistOrVideoCascadesEntries() {
        Playlist p1 = playlistRepository.saveAndFlush(new Playlist(alice, "List 1"));
        Playlist p2 = playlistRepository.saveAndFlush(new Playlist(alice, "List 2"));
        Playlist bobList = playlistRepository.saveAndFlush(new Playlist(bob, "Bob List"));
        playlistVideoRepository.saveAndFlush(new PlaylistVideo(p1, videoA));
        playlistVideoRepository.saveAndFlush(new PlaylistVideo(p2, videoB));
        playlistVideoRepository.saveAndFlush(new PlaylistVideo(bobList, videoA));

        jdbcTemplate.update("DELETE FROM videos WHERE id = ?", videoA.getId());
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM playlist_videos WHERE video_id = ?", Long.class, videoA.getId())).isZero();

        jdbcTemplate.update("DELETE FROM playlists WHERE id = ?", p2.getId());
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM playlist_videos WHERE playlist_id = ?", Long.class, p2.getId())).isZero();

        jdbcTemplate.update("DELETE FROM users WHERE id = ?", alice.getId());
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM playlists WHERE owner_id = ?", Long.class, alice.getId())).isZero();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM playlists WHERE owner_id = ?", Long.class, bob.getId())).isEqualTo(1L);
    }

    @Test
    void findVideosOrdersNewestAddedFirstAndCountsAreGrouped() {
        Playlist p1 = playlistRepository.saveAndFlush(new Playlist(alice, "List 1"));
        Playlist p2 = playlistRepository.saveAndFlush(new Playlist(alice, "List 2"));

        jdbcTemplate.update("INSERT INTO playlist_videos (playlist_id, video_id, added_at) VALUES (?, ?, ?)",
                p1.getId(), videoA.getId(), Timestamp.from(Instant.parse("2026-11-20T10:00:00Z")));
        jdbcTemplate.update("INSERT INTO playlist_videos (playlist_id, video_id, added_at) VALUES (?, ?, ?)",
                p1.getId(), videoB.getId(), Timestamp.from(Instant.parse("2026-11-21T10:00:00Z")));

        List<PlaylistVideoDto> videos = playlistVideoRepository.findVideosInPlaylist(p1.getId());
        assertThat(videos).extracting(PlaylistVideoDto::id).containsExactly(videoB.getId(), videoA.getId());

        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : playlistVideoRepository.countVideosByPlaylistIds(List.of(p1.getId(), p2.getId()))) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        assertThat(counts).containsOnly(Map.entry(p1.getId(), 2L));
        assertThat(playlistVideoRepository.findPlaylistIdsContainingVideo(alice.getId(), videoB.getId()))
                .containsExactly(p1.getId());
    }
}
