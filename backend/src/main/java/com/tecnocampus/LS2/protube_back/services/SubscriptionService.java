package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.Subscription;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.dto.ChannelDto;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.dto.SubscriptionStatusDto;
import com.tecnocampus.LS2.protube_back.dto.VideoSummaryDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.SubscriptionRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Subscriptions to channels (other users) and the feed of their videos.
 * <p>
 * Subscribing and unsubscribing are idempotent. Checks run in this order: authenticated user (401), channel exists
 * (404), channel is not yourself (400).
 */
@Service
@Transactional
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final VideoRepository videoRepository;

    public SubscriptionService(SubscriptionRepository subscriptionRepository, UserRepository userRepository,
                               VideoRepository videoRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.videoRepository = videoRepository;
    }

    public SubscriptionStatusDto subscribe(String subscriberUsername, String channelUsername) {
        User subscriber = requireUser(subscriberUsername);
        User channel = requireChannel(channelUsername, subscriber);
        if (!subscriptionRepository.existsBySubscriberIdAndChannelId(subscriber.getId(), channel.getId())) {
            // Two simultaneous first subscriptions: the second one hits the primary key and gets 409
            subscriptionRepository.saveAndFlush(new Subscription(subscriber, channel));
        }
        return new SubscriptionStatusDto(channel.getUsername(),
                subscriptionRepository.countByChannelId(channel.getId()), true);
    }

    public SubscriptionStatusDto unsubscribe(String subscriberUsername, String channelUsername) {
        User subscriber = requireUser(subscriberUsername);
        User channel = requireChannel(channelUsername, subscriber);
        subscriptionRepository.deleteBySubscriberIdAndChannelId(subscriber.getId(), channel.getId());
        return new SubscriptionStatusDto(channel.getUsername(),
                subscriptionRepository.countByChannelId(channel.getId()), false);
    }

    /** The channels the user follows, most recent subscription first. Always 3 queries at most (no N+1). */
    @Transactional(readOnly = true)
    public List<ChannelDto> getSubscriptions(String subscriberUsername) {
        User subscriber = requireUser(subscriberUsername);
        List<Subscription> subscriptions = subscriptionRepository.findChannelsOf(subscriber.getId());
        if (subscriptions.isEmpty()) {
            return List.of();
        }
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : subscriptionRepository.countSubscribersByChannelIds(
                subscriptions.stream().map(s -> s.getChannel().getId()).toList())) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return subscriptions.stream()
                .map(s -> {
                    User c = s.getChannel();
                    return new ChannelDto(c.getId(), c.getUsername(), c.getDisplayName(), c.getAvatarUrl(),
                            counts.getOrDefault(c.getId(), 0L), s.getCreatedAt());
                })
                .toList();
    }

    /** One page of the videos of the followed channels, newest first ({@code createdAt DESC, id DESC}). */
    @Transactional(readOnly = true)
    public PageDto<VideoSummaryDto> getFeed(String subscriberUsername, int page, int size) {
        VideoService.validatePage(page, size);
        User subscriber = requireUser(subscriberUsername);
        return PageDto.from(videoRepository.findFeed(subscriber.getId(), PageRequest.of(page, size))
                .map(VideoService::toSummary));
    }

    private User requireUser(String username) {
        if (username == null || username.isBlank()) {
            throw new BadCredentialsException("Authentication required");
        }
        return userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new BadCredentialsException("Authentication required"));
    }

    /** 404 if the channel does not exist, then 400 if it is the subscriber (in that order). */
    private User requireChannel(String channelUsername, User subscriber) {
        String name = channelUsername == null ? "" : channelUsername.trim();
        User channel = name.isEmpty() ? null : userRepository.findByUsername(name).orElse(null);
        if (channel == null) {
            throw new NotFoundException("User not found: " + name);
        }
        if (channel.getId().equals(subscriber.getId())) {
            throw new InvalidRequestException("You cannot subscribe to your own channel");
        }
        return channel;
    }
}
