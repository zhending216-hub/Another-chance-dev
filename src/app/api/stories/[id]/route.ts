import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerBackup } from '@/lib/auto-backup';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const story = await prisma.story.findUnique({ where: { id: params.id } });

    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    // Fetch like count
    const likeCount = await prisma.storyLike.count({ where: { storyId: params.id } });

    return NextResponse.json({
      success: true,
      story: {
        ...story,
        likeCount,
        isLiked: false,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: '获取故事失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, genre, era, author, visibility, publishedAt } = body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (genre !== undefined) data.genre = genre;
    if (era !== undefined) data.era = era;
    if (author !== undefined) data.author = author;
    if (visibility !== undefined) {
      data.visibility = visibility;
      if (visibility === 'PUBLIC' && !story.publishedAt) {
        data.publishedAt = new Date();
      }
    }
    if (publishedAt !== undefined) data.publishedAt = publishedAt ? new Date(publishedAt) : null;
    data.updatedAt = new Date();

    const updated = await prisma.story.update({
      where: { id: params.id },
      data,
    });

    triggerBackup();
    return NextResponse.json({ success: true, story: updated });
  } catch (error) {
    console.error('更新故事失败:', error);
    return NextResponse.json({ error: '更新故事失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    // Cascade delete via Prisma (segments, branches, characters, director states)
    await prisma.story.delete({ where: { id: params.id } });

    triggerBackup();
    return NextResponse.json({
      success: true,
      message: `故事「${story.title}」已删除`,
    });
  } catch (error) {
    console.error('删除故事失败:', error);
    return NextResponse.json({ error: '删除故事失败' }, { status: 500 });
  }
}
