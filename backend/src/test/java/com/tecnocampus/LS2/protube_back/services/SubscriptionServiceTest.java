package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.Subscription;
import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.domain.Video;
import com.tecnocampus.LS2.protube_back.dto.ChannelDto;
import com.tecnocampus.LS2.protube_back.dto.PageDto;
import com.tecnocampus.LS2.protube_back.dto.SubscriptionStatusDto;
import com.tecnocampus.LS2.protube_back.dto.VideoSummaryDto;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.exception.NotFoundException;
import com.tecnocampus.LS2.protube_back.repository.SubscriptionRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.BadCredentialsException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SubscriptionServiceTest {

    private SubscriptionRepository subscriptionRepository;
    private UserRepository userRepository;
    private VideoRepository videoRepository;
    private SubscriptionService service;

    private User me;
    private User alice;

    @BeforeEach
    void setUp() {
        subscriptionRepository = mock(SubscriptionRepository.class);
        userRepository = mock(UserRepository.class);
        videoRepository = mock(VideoRepository.class);
        service = new SubscriptionService(subscriptionRepository, userRepository, videoRepository);

        me = user(1L, "me_user");
        alice = user(2L, "alice");
        when(userRepository.findByUsername("me_user")).thenReturn(Optional.of(me));
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
    }

    @Test
    void subscribeSavesOnlyTheFirstTime() {
        when(subscriptionRepository.existsBySubscriberIdAndChannelId(1L, 2L)).thenReturn(false);
        when(subscriptionRepository.countByChannelId(2L)).thenReturn(1L);

        SubscriptionStatusDto status = service.subscribe("me_user", "alice");

        assertThat(status).isEqualTo(new SubscriptionStatusDto("alice", 1, true));
        verify(subscriptionRepository).saveAndFlush(any(Subscription.class));

        when(subscriptionRepository.existsBySubscriberIdAndChannelId(1L, 2L)).thenReturn(true);
        assertThat(service.subscribe("me_user", " alice ").subscribedByMe()).isTrue();
        verify(subscriptionRepository).saveAndFlush(any(Subscription.class)); // still once
    }

    @Test
    void unsubscribeDeletesAndReturnsTheNewCount() {
        when(subscriptionRepository.countByChannelId(2L)).thenReturn(0L);

        assertThat(service.unsubscribe("me_user", "alice")).isEqualTo(new SubscriptionStatusDto("alice", 0, false));
        verify(subscriptionRepository).deleteBySubscriberIdAndChannelId(1L, 2L);
    }

    @Test
    void unknownChannelIs404BeforeSelfCheck() {
        assertThatThrownBy(() -> service.subscribe("me_user", "ghost")).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.unsubscribe("me_user", "  ")).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.subscribe("me_user", null)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void subscribingToYourselfIs400() {
        assertThatThrownBy(() -> service.subscribe("me_user", "me_user"))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.unsubscribe("me_user", "me_user"))
                .isInstanceOf(InvalidRequestException.class);
        verify(subscriptionRepository, never()).saveAndFlush(any());
        verify(subscriptionRepository, never()).deleteBySubscriberIdAndChannelId(anyLong(), anyLong());
    }

    @Test
    void missingOrUnknownSubscriberIs401() {
        assertThatThrownBy(() -> service.subscribe(null, "alice")).isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> service.getSubscriptions(" ")).isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> service.getFeed("deleted_user", 0, 12))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void subscriptionsMapGroupedCounts() {
        User bob = user(3L, "bob");
        bob.setDisplayName("Bob B");
        Subscription toBob = new Subscription(me, bob);
        toBob.setCreatedAt(Instant.parse("2026-11-02T00:00:00Z"));
        Subscription toAlice = new Subscription(me, alice);
        when(subscriptionRepository.findChannelsOf(1L)).thenReturn(List.of(toBob, toAlice));
        when(subscriptionRepository.countSubscribersByChannelIds(List.of(3L, 2L)))
                .thenReturn(List.<Object[]>of(new Object[]{3L, 7L}, new Object[]{2L, 1L}));

        List<ChannelDto> channels = service.getSubscriptions("me_user");

        assertThat(channels).extracting(ChannelDto::username).containsExactly("bob", "alice");
        assertThat(channels.get(0).displayName()).isEqualTo("Bob B");
        assertThat(channels.get(0).subscriberCount()).isEqualTo(7);
        assertThat(channels.get(0).subscribedAt()).isEqualTo(Instant.parse("2026-11-02T00:00:00Z"));
        assertThat(channels.get(1).subscriberCount()).isEqualTo(1);
    }

    @Test
    void noSubscriptionsSkipsTheCountQuery() {
        when(subscriptionRepository.findChannelsOf(1L)).thenReturn(List.of());

        assertThat(service.getSubscriptions("me_user")).isEmpty();
        verify(subscriptionRepository, never()).countSubscribersByChannelIds(any());
    }

    @Test
    void feedAsksForTheRequestedPageWithoutExtraSort() {
        Video video = new Video("Fresh", "/media/f.mp4", alice);
        video.setId(9L);
        when(videoRepository.findFeed(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(video), PageRequest.of(2, 5), 11));

        PageDto<VideoSummaryDto> page = service.getFeed("me_user", 2, 5);

        assertThat(page.content()).extracting(VideoSummaryDto::author).containsExactly("alice");
        assertThat(page.page()).isEqualTo(2);
        assertThat(page.totalElements()).isEqualTo(11);
        assertThat(page.last()).isTrue();
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(videoRepository).findFeed(eq(1L), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(2);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(5);
        // The order (createdAt DESC, id DESC) is fixed in the query itself
        assertThat(pageable.getValue().getSort().isUnsorted()).isTrue();
    }

    @Test
    void feedValidatesPagingBeforeTouchingTheDatabase() {
        assertThatThrownBy(() -> service.getFeed("me_user", -1, 12)).isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.getFeed("me_user", 0, 0)).isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(videoRepository);
    }

    private static User user(Long id, String username) {
        User user = new User(username, username + "@example.com", "pass");
        user.setId(id);
        return user;
    }
}
