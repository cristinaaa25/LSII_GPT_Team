package com.tecnocampus.LS2.protube_back.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class PlaylistDomainTest {

    @Test
    void playlistEntityGettersSettersAndEquality() {
        User alice = new User("alice", "alice@example.com", "pass");
        alice.setId(1L);
        User bob = new User("bob", "bob@example.com", "pass");
        bob.setId(2L);

        Playlist p1 = new Playlist(alice, "Favorites");
        p1.setId(10L);
        Instant now = Instant.parse("2026-11-25T10:00:00Z");
        p1.setCreatedAt(now);
        p1.setOwner(bob);
        p1.setName("Updated");

        Playlist p2 = new Playlist();
        p2.setId(10L);
        Playlist p3 = new Playlist(alice, "Other");
        p3.setId(11L);

        assertThat(p1.getId()).isEqualTo(10L);
        assertThat(p1.getOwner()).isEqualTo(bob);
        assertThat(p1.getName()).isEqualTo("Updated");
        assertThat(p1.getCreatedAt()).isEqualTo(now);

        assertThat(p1).isEqualTo(p1);
        assertThat(p1).isEqualTo(p2);
        assertThat(p1).isNotEqualTo(p3);
        assertThat(p1).isNotEqualTo(null);
        assertThat(p1).isNotEqualTo("not-a-playlist");
        assertThat(p1.hashCode()).isEqualTo(p2.hashCode());
    }

    @Test
    void playlistVideoAndIdEqualityAndAccessors() {
        User alice = new User("alice", "alice@example.com", "pass");
        alice.setId(1L);
        Playlist playlist = new Playlist(alice, "Queue");
        playlist.setId(10L);
        Playlist otherPlaylist = new Playlist(alice, "Other");
        otherPlaylist.setId(11L);

        Video v1 = new Video("V1", "v1.mp4", alice);
        v1.setId(100L);
        Video v2 = new Video("V2", "v2.mp4", alice);
        v2.setId(101L);

        PlaylistVideo pv1 = new PlaylistVideo(playlist, v1);
        Instant added = Instant.parse("2026-11-25T10:05:00Z");
        pv1.setAddedAt(added);
        PlaylistVideo pvSame = new PlaylistVideo(playlist, v1);
        PlaylistVideo pvDiffVideo = new PlaylistVideo(playlist, v2);
        PlaylistVideo pvDiffPlaylist = new PlaylistVideo(otherPlaylist, v1);

        assertThat(pv1.getPlaylist()).isEqualTo(playlist);
        assertThat(pv1.getVideo()).isEqualTo(v1);
        assertThat(pv1.getAddedAt()).isEqualTo(added);
        assertThat(pv1).isEqualTo(pv1);
        assertThat(pv1).isEqualTo(pvSame);
        assertThat(pv1).isNotEqualTo(pvDiffVideo);
        assertThat(pv1).isNotEqualTo(pvDiffPlaylist);
        assertThat(pv1).isNotEqualTo(null);
        assertThat(pv1).isNotEqualTo("other");
        assertThat(pv1.hashCode()).isEqualTo(pvSame.hashCode());

        PlaylistVideoId idEmpty = new PlaylistVideoId();
        PlaylistVideoId id1 = new PlaylistVideoId(10L, 100L);
        PlaylistVideoId id1Copy = new PlaylistVideoId(10L, 100L);
        PlaylistVideoId idDiffVideo = new PlaylistVideoId(10L, 101L);
        PlaylistVideoId idDiffPlaylist = new PlaylistVideoId(11L, 100L);

        assertThat(id1).isEqualTo(id1);
        assertThat(id1).isEqualTo(id1Copy);
        assertThat(id1).isNotEqualTo(idEmpty);
        assertThat(id1).isNotEqualTo(idDiffVideo);
        assertThat(id1).isNotEqualTo(idDiffPlaylist);
        assertThat(id1).isNotEqualTo(null);
        assertThat(id1).isNotEqualTo("other");
        assertThat(id1.hashCode()).isEqualTo(id1Copy.hashCode());
    }
}
