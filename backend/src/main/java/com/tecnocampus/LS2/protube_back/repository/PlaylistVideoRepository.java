package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.PlaylistVideo;
import com.tecnocampus.LS2.protube_back.domain.PlaylistVideoId;
import com.tecnocampus.LS2.protube_back.dto.PlaylistVideoDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface PlaylistVideoRepository extends JpaRepository<PlaylistVideo, PlaylistVideoId> {

    @Query("""
            SELECT COUNT(pv) > 0 FROM PlaylistVideo pv
            WHERE pv.playlist.id = :playlistId AND pv.video.id = :videoId
            """)
    boolean existsByPlaylistIdAndVideoId(@Param("playlistId") Long playlistId,
                                         @Param("videoId") Long videoId);

    @Modifying
    @Query("DELETE FROM PlaylistVideo pv WHERE pv.playlist.id = :playlistId AND pv.video.id = :videoId")
    int deleteByPlaylistIdAndVideoId(@Param("playlistId") Long playlistId,
                                     @Param("videoId") Long videoId);

    long countByPlaylistId(Long playlistId);

    @Query("""
            SELECT pv.playlist.id, COUNT(pv) FROM PlaylistVideo pv
            WHERE pv.playlist.id IN :playlistIds
            GROUP BY pv.playlist.id
            """)
    List<Object[]> countVideosByPlaylistIds(@Param("playlistIds") Collection<Long> playlistIds);

    @Query("""
            SELECT pv.playlist.id FROM PlaylistVideo pv
            WHERE pv.playlist.owner.id = :ownerId AND pv.video.id = :videoId
            """)
    List<Long> findPlaylistIdsContainingVideo(@Param("ownerId") Long ownerId,
                                              @Param("videoId") Long videoId);

    @Query("""
            SELECT new com.tecnocampus.LS2.protube_back.dto.PlaylistVideoDto(
                v.id, v.title, u.username, v.duration, v.viewCount, v.thumbnailUrl, pv.addedAt
            )
            FROM PlaylistVideo pv
            JOIN pv.video v
            JOIN v.uploader u
            WHERE pv.playlist.id = :playlistId
            ORDER BY pv.addedAt DESC, v.id DESC
            """)
    List<PlaylistVideoDto> findVideosInPlaylist(@Param("playlistId") Long playlistId);
}
