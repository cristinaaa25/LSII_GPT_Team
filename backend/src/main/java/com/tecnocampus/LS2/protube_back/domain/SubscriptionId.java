package com.tecnocampus.LS2.protube_back.domain;

import java.io.Serializable;
import java.util.Objects;

/** Composite key of {@link Subscription}: the ids of the subscriber and of the channel. */
public class SubscriptionId implements Serializable {

    private Long subscriber;
    private Long channel;

    public SubscriptionId() {
    }

    public SubscriptionId(Long subscriber, Long channel) {
        this.subscriber = subscriber;
        this.channel = channel;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SubscriptionId that = (SubscriptionId) o;
        return Objects.equals(subscriber, that.subscriber) && Objects.equals(channel, that.channel);
    }

    @Override
    public int hashCode() {
        return Objects.hash(subscriber, channel);
    }
}
