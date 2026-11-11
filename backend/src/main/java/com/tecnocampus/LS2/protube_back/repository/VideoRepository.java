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
    @EntityGraph(attributePaths = "uploader")
    List<Video> findByUploaderIdOrderByCreatedAtDesc(Long uploaderId);

    /** One page of the videos uploaded by {@code uploaderId}; order comes from the {@link Pageable}. */
    @EntityGraph(attributePaths = "uploader")
    Page<Video> findByUploaderId(Long uploaderId, Pageable pageable);

    List<Video> findByTitleContainingIgnoreCase(String query);
    boolean existsByStoreId(Long storeId);

    // Fetches the uploader in the same query to avoid N+1 selects when mapping to DTOs
    @EntityGraph(attributePaths = "uploader")
    Page<Video> findAllBy(Pageable pageable);

    /**
     * Case-insensitive search over title, tags and description, ranked by where the match is.
     * <p>
     * Score = sum of the weights that apply:
     * <ul>
     *   <li>64 title starts with the query ({@code prefix})</li>
     *   <li>32 a later word of the title starts with the query ({@code wordPrefix}, i.e. after a space)</li>
     *   <li>16 a tag starts with the query ({@code prefix})</li>
     *   <li>4 title contains it, 2 a tag contains it, 1 description contains it ({@code pattern})</li>
     * </ul>
     * Each start-of-word weight is bigger than all the smaller weights together (64 &gt; 32+16+7, 32 &gt; 16+7,
     * 16 &gt; 7), so the order is title prefix &gt; title word prefix &gt; tag prefix &gt; any match in the middle
     * of a word, and inside each tier the old title &gt; tag &gt; description order still applies.
     * Ties are broken newest first.
     * <p>
     * All patterns must be lower case with {@code %}, {@code _} and the backslash in user input escaped with a
     * backslash (see {@code VideoService#toLikePattern}): {@code pattern} is {@code %q%}, {@code prefix} is
     * {@code q%} and {@code wordPrefix} is {@code % q%}. A prefix match is always a contains match too, so
     * {@code pattern} alone is enough in the WHERE clause.
     */
    @EntityGraph(attributePaths = "uploader")
    @Query(value = """
            SELECT v FROM Video v
            WHERE LOWER(v.title) LIKE :pattern ESCAPE '\\'
               OR LOWER(v.description) LIKE :pattern ESCAPE '\\'
               OR EXISTS (SELECT 1 FROM Video t JOIN t.tags tag
                          WHERE t = v AND LOWER(tag) LIKE :pattern ESCAPE '\\')
            ORDER BY
                CASE WHEN LOWER(v.title) LIKE :prefix ESCAPE '\\' THEN 64 ELSE 0 END
              + CASE WHEN LOWER(v.title) LIKE :wordPrefix ESCAPE '\\' THEN 32 ELSE 0 END
              + CASE WHEN EXISTS (SELECT 1 FROM Video t JOIN t.tags tag
                                  WHERE t = v AND LOWER(tag) LIKE :prefix ESCAPE '\\') THEN 16 ELSE 0 END
              + CASE WHEN LOWER(v.title) LIKE :pattern ESCAPE '\\' THEN 4 ELSE 0 END
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
    Page<Video> search(@Param("pattern") String pattern, @Param("prefix") String prefix,
                       @Param("wordPrefix") String wordPrefix, Pageable pageable);
}
