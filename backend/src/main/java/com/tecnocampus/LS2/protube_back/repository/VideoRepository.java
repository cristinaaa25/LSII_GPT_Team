package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Video;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /**
     * Case-insensitive search over title, tags and description, ranked by where the match is:
     * title (4) > tag (2) > description (1); ties are broken newest first.
     * {@code pattern} must be lower case and wrapped in {@code %}; {@code %}, {@code _} and the backslash in user
     * input must be escaped with a backslash (see {@code VideoService#toLikePattern}).
     */
    @EntityGraph(attributePaths = "uploader")
    @Query(value = """
            SELECT v FROM Video v
            WHERE LOWER(v.title) LIKE :pattern ESCAPE '\\'
               OR LOWER(v.description) LIKE :pattern ESCAPE '\\'
               OR EXISTS (SELECT 1 FROM Video t JOIN t.tags tag
                          WHERE t = v AND LOWER(tag) LIKE :pattern ESCAPE '\\')
            ORDER BY
                CASE WHEN LOWER(v.title) LIKE :pattern ESCAPE '\\' THEN 4 ELSE 0 END
              + CASE WHEN EXISTS (SELECT 1 FROM Video t JOIN t.tags tag
                                  WHERE t = v AND LOWER(tag) LIKE :pattern ESCAPE '\\') THEN 2 ELSE 0 END
              + CASE WHEN LOWER(v.description) LIKE :pattern ESCAPE '\\' THEN 1 ELSE 0 END DESC,
                v.createdAt DESC, v.id DESC
            """,
            countQuery = """
            SELECT COUNT(v) FROM Video v
            WHERE LOWER(v.title) LIKE :pattern ESCAPE '\\'
               OR LOWER(v.description) LIKE :pattern ESCAPE '\\'
               OR EXISTS (SELECT 1 FROM Video t JOIN t.tags tag
                          WHERE t = v AND LOWER(tag) LIKE :pattern ESCAPE '\\')
            """)
    Page<Video> search(@Param("pattern") String pattern, Pageable pageable);
}
