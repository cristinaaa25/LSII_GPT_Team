import type { Page } from './video';

export interface Comment {
  id: number;
  videoId: number;
  text: string;
  author: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  parentId?: number | null;
  replies: Comment[];
}

export type CommentsPage = Page<Comment>;

export interface CommentLikeResponse {
  commentId: number;
  likeCount: number;
  likedByMe: boolean;
}
