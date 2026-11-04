package com.tecnocampus.LS2.protube_back.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "video_views")
public class VideoView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User viewer;

    @Column(name = "viewed_at", nullable = false, updatable = false)
    private Instant viewedAt = Instant.now();

    public VideoView() {
    }

    public VideoView(Video video) {
        this.video = video;
        this.viewedAt = Instant.now();
    }

    public VideoView(Video video, User viewer) {
        this.video = video;
        this.viewer = viewer;
        this.viewedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Video getVideo() {
        return video;
    }

    public void setVideo(Video video) {
        this.video = video;
    }

    public User getViewer() {
        return viewer;
    }

    public void setViewer(User viewer) {
        this.viewer = viewer;
    }

    public Instant getViewedAt() {
        return viewedAt;
    }

    public void setViewedAt(Instant viewedAt) {
        this.viewedAt = viewedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        VideoView videoView = (VideoView) o;
        return Objects.equals(id, videoView.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
