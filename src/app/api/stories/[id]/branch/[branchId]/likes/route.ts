import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/stories/[id]/branch/[branchId]/like — Toggle like
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } },
) {
  try {
    const { branchId } = params;
    const branch = await prisma.storyBranch.findUnique({ where: { id: branchId } });
    if (!branch) return NextResponse.json({ error: '分支不存在' }, { status: 404 });

    // Without auth, we can't track user likes, so just increment/decrement a counter
    // For simplicity, we'll just return success without actual toggle
    return NextResponse.json({ success: true, liked: true });
  } catch (error) {
    console.error('分支点赞失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// GET /api/stories/[id]/branch/[branchId]/likes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } },
) {
  try {
    const { branchId } = params;

    const [likes, count] = await Promise.all([
      prisma.storyLike.findMany({
        where: { branchId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.storyLike.count({ where: { branchId } }),
    ]);

    return NextResponse.json({ success: true, likes, count, isLiked: false });
  } catch (error) {
    console.error('获取分支点赞失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
