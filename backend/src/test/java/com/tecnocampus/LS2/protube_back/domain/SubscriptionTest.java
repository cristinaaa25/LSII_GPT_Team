package com.tecnocampus.LS2.protube_back.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class SubscriptionTest {

    @Test
    void subscriptionIdEqualityUsesBothIds() {
        SubscriptionId id = new SubscriptionId(1L, 2L);

        assertThat(id).isEqualTo(id);
        assertThat(id).isEqualTo(new SubscriptionId(1L, 2L)).hasSameHashCodeAs(new SubscriptionId(1L, 2L));
        assertThat(id).isNotEqualTo(new SubscriptionId(2L, 1L));
        assertThat(id).isNotEqualTo(new SubscriptionId(1L, 3L));
        assertThat(id).isNotEqualTo(null);
        assertThat(id).isNotEqualTo("1-2");
        assertThat(new SubscriptionId()).isEqualTo(new SubscriptionId());
    }

    @Test
    void subscriptionEqualityUsesSubscriberAndChannel() {
        User ann = new User("ann", "ann@example.com", "pass");
        User ben = new User("ben", "ben@example.com", "pass");
        // User equality is by id
        ann.setId(1L);
        ben.setId(2L);
        Subscription subscription = new Subscription(ann, ben);

        assertThat(subscription.getSubscriber()).isSameAs(ann);
        assertThat(subscription.getChannel()).isSameAs(ben);
        assertThat(subscription.getCreatedAt()).isNotNull();

        Instant date = Instant.parse("2026-11-23T10:00:00Z");
        subscription.setCreatedAt(date);
        assertThat(subscription.getCreatedAt()).isEqualTo(date);

        assertThat(subscription).isEqualTo(subscription);
        assertThat(subscription).isEqualTo(new Subscription(ann, ben))
                .hasSameHashCodeAs(new Subscription(ann, ben));
        assertThat(subscription).isNotEqualTo(new Subscription(ben, ann));
        assertThat(subscription).isNotEqualTo(new Subscription(ann, ann));
        assertThat(subscription).isNotEqualTo(null);
        assertThat(subscription).isNotEqualTo("ann-ben");
    }
}
