import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';

const router = Router();

// Like/Unlike post (PUBLIC)
router.post('/like', async (req: Request, res: Response) => {
  try {
    const { postId, sessionId } = req.body;

    if (!postId || !sessionId) {
      return res.status(400).json({ error: 'Post ID and session ID are required' });
    }

    // Check if already liked
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_sessionId: {
          postId,
          sessionId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.postLike.delete({
        where: { id: existingLike.id },
      });
      res.json({ liked: false });
    } else {
      // Like
      await prisma.postLike.create({
        data: { postId, sessionId },
      });
      res.json({ liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Comment on post (PUBLIC)
router.post('/comment', async (req: Request, res: Response) => {
  try {
    const { postId, sessionId, content, parentId } = req.body;

    if (!postId || !sessionId || !content) {
      return res.status(400).json({ error: 'Post ID, session ID, and content are required' });
    }

    const comment = await prisma.postComment.create({
      data: {
        postId,
        sessionId,
        content,
        parentId: parentId || null,
      },
      include: {
        replies: true,
      },
    });

    res.status(201).json({ comment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Get comments for post (PUBLIC)
router.get('/posts/:postId/comments', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const comments = await prisma.postComment.findMany({
      where: {
        postId,
        parentId: null, // Top-level comments only
      },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Share post (PUBLIC)
router.post('/share', async (req: Request, res: Response) => {
  try {
    const { postId, sessionId, shareType = 'link' } = req.body;

    if (!postId || !sessionId) {
      return res.status(400).json({ error: 'Post ID and session ID are required' });
    }

    const share = await prisma.postShare.create({
      data: {
        postId,
        sessionId,
        shareType,
      },
    });

    res.status(201).json({ share });
  } catch (error) {
    res.status(500).json({ error: 'Failed to share post' });
  }
});

// Repost (PUBLIC)
router.post('/repost', async (req: Request, res: Response) => {
  try {
    const { postId, sessionId } = req.body;

    if (!postId || !sessionId) {
      return res.status(400).json({ error: 'Post ID and session ID are required' });
    }

    // Check if already reposted
    const existingRepost = await prisma.postRepost.findUnique({
      where: {
        postId_sessionId: {
          postId,
          sessionId,
        },
      },
    });

    if (existingRepost) {
      // Unrepost
      await prisma.postRepost.delete({
        where: { id: existingRepost.id },
      });
      res.json({ reposted: false });
    } else {
      // Repost
      const repost = await prisma.postRepost.create({
        data: { postId, sessionId },
      });
      res.json({ reposted: true, repost });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle repost' });
  }
});

// Track engagement (view, swipe, watch time) (PUBLIC)
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { postId, sessionId, action, value, metadata } = req.body;

    if (!postId || !sessionId || !action) {
      return res.status(400).json({ error: 'Post ID, session ID, and action are required' });
    }

    const engagement = await prisma.feedEngagement.create({
      data: {
        postId,
        sessionId,
        action,
        value,
        metadata: metadata || {},
      },
    });

    // Update view count if action is 'view'
    if (action === 'view') {
      await prisma.feedPost.update({
        where: { id: postId },
        data: {
          viewCount: { increment: 1 },
        },
      });
    }

    res.status(201).json({ engagement });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track engagement' });
  }
});

// Check if user has liked/reposted (PUBLIC)
router.get('/posts/:postId/status', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.json({ liked: false, reposted: false });
    }

    const [like, repost] = await Promise.all([
      prisma.postLike.findUnique({
        where: {
          postId_sessionId: {
            postId,
            sessionId: sessionId as string,
          },
        },
      }),
      prisma.postRepost.findUnique({
        where: {
          postId_sessionId: {
            postId,
            sessionId: sessionId as string,
          },
        },
      }),
    ]);

    res.json({
      liked: !!like,
      reposted: !!repost,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;
