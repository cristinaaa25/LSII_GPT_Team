package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.domain.Subscription;
import com.tecnocampus.LS2.protube_back.domain.SubscriptionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, SubscriptionId> {

    /** Explicit query: the derived one joins and loads both users, which a yes/no answer does not need. */
    @Query("""
            SELECT COUNT(s) > 0 FROM Subscription s
            WHERE s.subscriber.id = :subscriberId AND s.channel.id = :channelId
            """)
    boolean existsBySubscriberIdAndChannelId(@Param("subscriberId") Long subscriberId,
                                             @Param("channelId") Long channelId);

    /** Whether the user called {@code subscriberUsername} follows {@code channelId}, in one query (no user lookup). */
    @Query("""
            SELECT COUNT(s) > 0 FROM Subscription s
            WHERE s.subscriber.username = :subscriberUsername AND s.channel.id = :channelId
            """)
    boolean existsBySubscriberUsernameAndChannelId(@Param("subscriberUsername") String subscriberUsername,
                                                   @Param("channelId") Long channelId);

    long countByChannelId(Long channelId);

    @Modifying
    @Query("DELETE FROM Subscription s WHERE s.subscriber.id = :subscriberId AND s.channel.id = :channelId")
    int deleteBySubscriberIdAndChannelId(@Param("subscriberId") Long subscriberId, @Param("channelId") Long channelId);

    /** The channels {@code subscriberId} follows, with the channel user loaded, most recent subscription first. */
    @Query("""
            SELECT s FROM Subscription s JOIN FETCH s.channel c
            WHERE s.subscriber.id = :subscriberId
            ORDER BY s.createdAt DESC, c.id DESC
            """)
    List<Subscription> findChannelsOf(@Param("subscriberId") Long subscriberId);

    /** Rows of {@code [channelId, subscriberCount]} for the given channels, in one grouped query. */
    @Query("""
            SELECT s.channel.id, COUNT(s) FROM Subscription s
            WHERE s.channel.id IN :channelIds
            GROUP BY s.channel.id
            """)
    List<Object[]> countSubscribersByChannelIds(@Param("channelIds") Collection<Long> channelIds);
}
