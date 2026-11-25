package com.tecnocampus.LS2.protube_back.domain;

import java.io.Serializable;
import java.util.Objects;

/** Composite key of {@link PlaylistVideo}: the ids of the playlist and the video. */
public class PlaylistVideoId implements Serializable {

    private Long playlist;
    private Long video;

    public PlaylistVideoId() {
    }

    public PlaylistVideoId(Long playlist, Long video) {
        this.playlist = playlist;
        this.video = video;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PlaylistVideoId that = (PlaylistVideoId) o;
        return Objects.equals(playlist, that.playlist) && Objects.equals(video, that.video);
    }

    @Override
    public int hashCode() {
        return Objects.hash(playlist, video);
    }
}
