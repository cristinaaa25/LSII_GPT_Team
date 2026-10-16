package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Video;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {
    List<Video> findByUploaderId(Long uploaderId);
    List<Video> findByTitleContainingIgnoreCase(String query);
    boolean existsByStoreId(Long storeId);

    // Fetches the uploader in the same query to avoid N+1 selects when mapping to DTOs
    @EntityGraph(attributePaths = "uploader")
    Page<Video> findAllBy(Pageable pageable);
}
