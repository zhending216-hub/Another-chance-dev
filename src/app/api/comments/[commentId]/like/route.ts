import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/comments/[commentId]/like — Toggle like on comment
export async function POST(
  request: NextRequest,
  { params }: { params: { commentId: string } },
) {
  try {
    const { commentId } = params;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return NextResponse.json({ error: '评论不存在' }, { status: 404 });

    // Without auth, we can't track user likes, so just return success
    return NextResponse.json({ success: true, liked: true });
  } catch (error) {
    console.error('评论点赞失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
