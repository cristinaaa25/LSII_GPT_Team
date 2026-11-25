package com.tecnocampus.LS2.protube_back.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

/** Entry linking a {@link Video} to a {@link Playlist}. See V8__playlists.sql. */
@Entity
@Table(name = "playlist_videos")
@IdClass(PlaylistVideoId.class)
public class PlaylistVideo {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "playlist_id", nullable = false)
    private Playlist playlist;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt = Instant.now();

    protected PlaylistVideo() {
    }

    public PlaylistVideo(Playlist playlist, Video video) {
        this.playlist = playlist;
        this.video = video;
        this.addedAt = Instant.now();
    }

    public Playlist getPlaylist() {
        return playlist;
    }

    public Video getVideo() {
        return video;
    }

    public Instant getAddedAt() {
        return addedAt;
    }

    public void setAddedAt(Instant addedAt) {
        this.addedAt = addedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PlaylistVideo that = (PlaylistVideo) o;
        return Objects.equals(playlist, that.playlist) && Objects.equals(video, that.video);
    }

    @Override
    public int hashCode() {
        return Objects.hash(playlist, video);
    }
}
