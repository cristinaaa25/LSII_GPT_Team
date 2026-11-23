import { VideoSummary } from './video';

export interface UserProfile {
  id: number;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  videos: VideoSummary[];
  /** Number of users subscribed to this channel. */
  subscriberCount: number;
  /** Whether the current user is subscribed (always false when not logged in). */
  subscribedByMe: boolean;
}

export interface UpdateProfilePayload {
  displayName?: string;
  description?: string;
}

/** Response of PUT/DELETE /api/users/{username}/subscription. */
export interface SubscriptionStatus {
  username: string;
  subscriberCount: number;
  subscribedByMe: boolean;
}

/** A channel the current user is subscribed to (GET /api/users/me/subscriptions). */
export interface Channel {
  id: number;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  subscriberCount: number;
  /** ISO-8601 date of the subscription. */
  subscribedAt: string;
}
