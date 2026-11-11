package com.tecnocampus.LS2.protube_back.domain;

import java.io.Serializable;
import java.util.Objects;

public class VideoLikeId implements Serializable {

    private Long user;
    private Long video;

    public VideoLikeId() {
    }

    public VideoLikeId(Long user, Long video) {
        this.user = user;
        this.video = video;
    }

    public Long getUser() {
        return user;
    }

    public void setUser(Long user) {
        this.user = user;
    }

    public Long getVideo() {
        return video;
    }

    public void setVideo(Long video) {
        this.video = video;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        VideoLikeId that = (VideoLikeId) o;
        return Objects.equals(user, that.user) && Objects.equals(video, that.video);
    }

    @Override
    public int hashCode() {
        return Objects.hash(user, video);
    }
}
