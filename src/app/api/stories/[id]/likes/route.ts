import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/stories/[id]/like — Toggle like
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id: storyId } = params;
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    // Without auth, we can't track user likes, so just return success
    return NextResponse.json({ success: true, liked: true });
  } catch (error) {
    console.error('点赞操作失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// GET /api/stories/[id]/likes — Get likes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id: storyId } = params;

    const [likes, count] = await Promise.all([
      prisma.storyLike.findMany({
        where: { storyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.storyLike.count({ where: { storyId } }),
    ]);

    return NextResponse.json({
      success: true,
      likes,
      count,
      isLiked: false,
    });
  } catch (error) {
    console.error('获取点赞失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
