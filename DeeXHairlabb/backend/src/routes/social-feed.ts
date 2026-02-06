import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

// Custom validator for URLs or data URIs (base64 encoded images/videos)
const urlOrDataUri = z.string().refine(
  (val) => {
    if (!val) return true;
    // Accept data URIs (base64 encoded)
    if (val.startsWith('data:')) return true;
    // Accept standard URLs
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Must be a valid URL or data URI' }
);

const createPostSchema = z.object({
  mediaId: z.string().uuid().optional(),
  type: z.enum(['image', 'video', 'text']),
  content: z.string().optional(),
  mediaUrl: urlOrDataUri.optional(),
  thumbnailUrl: urlOrDataUri.optional(),
  caption: z.string().optional(),
  published: z.boolean().default(true),
});

// Calculate engagement score for a post
async function calculateEngagementScore(postId: string): Promise<number> {
  const [likes, comments, shares, reposts, views] = await Promise.all([
    prisma.postLike.count({ where: { postId } }),
    prisma.postComment.count({ where: { postId } }),
    prisma.postShare.count({ where: { postId } }),
    prisma.postRepost.count({ where: { postId } }),
    prisma.feedEngagement.count({ where: { postId, action: 'view' } }),
  ]);

  // Algorithm: Weighted engagement signals
  // Likes: 1 point, Comments: 3 points, Shares: 5 points, Reposts: 10 points, Views: 0.01 points
  const score =
    likes * 1 +
    comments * 3 +
    shares * 5 +
    reposts * 10 +
    views * 0.01;

  // Recency boost: Posts from last 24 hours get 1.5x multiplier
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (post) {
    const hoursSincePost = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSincePost < 24) {
      return score * 1.5;
    }
  }

  return score;
}

// Get feed posts (PUBLIC - algorithmically ordered)
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    // Get all published posts
    const posts = await prisma.feedPost.findMany({
      where: { published: true },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
            reposts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Calculate engagement scores and sort
    const postsWithScores = await Promise.all(
      posts.map(async (post) => {
        const score = await calculateEngagementScore(post.id);
        return {
          ...post,
          engagementScore: score,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          shareCount: post._count.shares,
          repostCount: post._count.reposts,
        };
      })
    );

    // Sort by engagement score (descending)
    postsWithScores.sort((a, b) => b.engagementScore - a.engagementScore);

    // Update cached counts in database
    await Promise.all(
      postsWithScores.map((post) =>
        prisma.feedPost.update({
          where: { id: post.id },
          data: {
            engagementScore: post.engagementScore,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            shareCount: post.shareCount,
            repostCount: post.repostCount,
          },
        })
      )
    );

    res.json({
      posts: postsWithScores.map(({ _count, ...post }) => post),
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Get single post (PUBLIC)
router.get('/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const post = await prisma.feedPost.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
            reposts: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({
      post: {
        ...post,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        shareCount: post._count.shares,
        repostCount: post._count.reposts,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Create post (admin only)
router.post('/posts', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = createPostSchema.parse(req.body);

    const post = await prisma.feedPost.create({
      data: {
        ...data,
        postedBy: req.user!.id,
      },
    });

    res.status(201).json({ post });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update post (admin only)
router.patch('/posts/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createPostSchema.partial().parse(req.body);

    const post = await prisma.feedPost.update({
      where: { id },
      data,
    });

    res.json({ post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete post (admin only)
router.delete('/posts/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.feedPost.delete({
      where: { id },
    });

    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;
