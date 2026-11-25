package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, Long> {

    List<Playlist> findByOwnerIdOrderByCreatedAtAscIdAsc(Long ownerId);

    Optional<Playlist> findByOwnerIdAndName(Long ownerId, String name);

    boolean existsByOwnerIdAndName(Long ownerId, String name);
}
