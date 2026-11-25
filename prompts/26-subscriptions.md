# Channel subscriptions and feed

**Approved on:** 2026-11-23 (PR #37)
**Approved by:** team review in PR #37
**Used for:** adding a follow relation between users (migration, idempotent PUT/DELETE, counts on a public resource,
a paged feed without N+1) and its React UI with protected page, plus E2E coverage.

## Prompt

```
Let users subscribe to channels (other users) and see a feed of their new videos.
1. Migration V6: subscriptions (subscriber_id, channel_id, created_at), unique pair, no self-subscription.
2. PUT / DELETE /api/users/{username}/subscription: authenticated, idempotent; yourself → 400; unknown → 404.
3. GET /api/users/{username}: add subscriberCount and subscribedByMe (false for anonymous); keep existing fields.
4. GET /api/users/me/subscriptions (channels) and GET /api/users/me/feed?page=&size= (videos of subscribed
   channels, newest first, PageDto). Avoid N+1.
5. Frontend: Subscribe/Subscribed button and subscriber count on PublicProfilePage; protected /subscriptions page
   with the channel list and the feed (reuse VideoCard and "load more"); link in the header user menu.
Before coding, list the files you will change and wait for my confirmation.
Tests: idempotency, self-subscription, counts, feed order and paging, query count, and the frontend states.
```

Follow-up conditions given after the file list was approved:

```
Include an E2E test (check the spec number does not clash with open PRs). Conditions:
(1) an expired or invalid token on GET /api/users/{username} must give 200 with subscribedByMe=false, with a test;
(2) subscriberCount of the channel list in a single grouped query, covered by the query-count test;
(3) feed ordered by createdAt DESC, id DESC;
(4) first 404 if the user does not exist, then 400 if it is yourself.
```

Extra request after the first review (subscribe from the video page, like YouTube):

```
Also add the Subscribe button on the video detail page, in the same branch.
1. Backend: add authorSubscriberCount and subscribedByMe to VideoDetailDto for GET /api/videos/{id} (keep existing
   fields). subscribedByMe false for anonymous / invalid token / own video. No extra N+1; keep the query count
   reasonable and cover it in a test (including invalid token → 200 + false).
2. Frontend VideoDetailPage: author name (link to profile) + subscriber count + Subscribe/Subscribed button. Extract a
   shared SubscribeButton component used by PublicProfilePage too (anonymous → link to /login with state.from, hidden
   on own video, disabled while saving, error message). Update the count/state from the SubscriptionStatusDto response.
3. Tests: backend DTO fields (anonymous / subscribed / own video / invalid token), front (SubscribeButton states,
   VideoDetailPage with the button), extend e2e 08 with subscribing from a video page.
```

## Notes

- Schema: composite primary key `(subscriber_id, channel_id)` (the unique pair), `CHECK (subscriber_id <> channel_id)`,
  `ON DELETE CASCADE` on both foreign keys, index on `channel_id` for counts. Portable SQL (H2 + PostgreSQL).
- `SecurityConfig` needed no change: `/api/users/me/**` and non-GET `/api/**` already require a token, and
  `GET /api/users/*` is public. An invalid or expired token on that GET is ignored by `JwtAuthenticationFilter`,
  so the request is anonymous (tested in `SubscriptionIntegrationTest`).
- Query counts (`SubscriptionQueryCountTest`): channel list 3 (user, subscriptions with channel, one grouped count),
  feed 2 (user, page with uploader), profile 3 anonymous / 4 with a viewer, whatever the numbers of rows.
- PUT/DELETE return `{username, subscriberCount, subscribedByMe}` so the UI updates without reloading the profile.
- Two simultaneous first subscriptions of the same pair: the second hits the primary key and gets 409 (same as
  video likes). Unsubscribing never fails.
- The front sends the token with `GET /api/users/{username}`; anonymous visitors get a "Subscribe" link to `/login`
  that returns to the profile after logging in. No button on your own profile.
- Video page: `VideoDetailDto` gains `authorSubscriberCount` and `subscribedByMe` (also filled in the PUT
  `/api/videos/{id}` and upload responses, so editing a video does not reset the count in the UI). Query count of
  `getVideo`: 6 anonymous (5 before + 1 count), 9 with a viewer, 7 on your own video. The `exists` checks use explicit
  JPQL because the derived queries joined and loaded both users.
- `SubscribeButton` reads `AuthContext` with `useContext` (not `useAuth`) so pages rendered without a provider behave
  as anonymous, like the like button of `VideoDetailPage`.
- `e2e/tests/08-subscriptions.spec.ts` (open PR #36 adds no E2E specs).
