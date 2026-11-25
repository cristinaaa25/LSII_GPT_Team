package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.dto.HistoryVideoDto;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoViewRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Watch history for authenticated users: paginated distinct watched videos and clearing history without altering
 * video view counts or analytics.
 */
@Service
@Transactional
public class HistoryService {

    private final VideoViewRepository videoViewRepository;
    private final UserRepository userRepository;

    public HistoryService(VideoViewRepository videoViewRepository, UserRepository userRepository) {
        this.videoViewRepository = videoViewRepository;
        this.userRepository = userRepository;
    }

    /** Distinct videos viewed by {@code username}, most recent view first. */
    @Transactional(readOnly = true)
    public PageDto<HistoryVideoDto> getHistory(String username, int page, int size) {
        VideoService.validatePage(page, size);
        User viewer = requireUser(username);
        return PageDto.from(videoViewRepository.findHistoryByViewerId(viewer.getId(), PageRequest.of(page, size)));
    }

    /** Clears {@code username}'s history by setting {@code viewer = null} on their views. */
    public void clearHistory(String username) {
        User viewer = requireUser(username);
        videoViewRepository.clearViewerByViewerId(viewer.getId());
    }

    private User requireUser(String username) {
        if (username == null || username.isBlank()) {
            throw new BadCredentialsException("Authentication required");
        }
        return userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new BadCredentialsException("Authentication required"));
    }
}
