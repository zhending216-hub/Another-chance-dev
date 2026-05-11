import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { storiesStore } from '@/lib/simple-db';

import { characterManager } from '@/lib/character-engine';
import { generateCoverImage } from '@/lib/cover-generator';
import { triggerBackup } from '@/lib/auto-backup';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feed = searchParams.get('feed');

    let where: any = { visibility: 'PUBLIC' };

    let stories: any[];
    try {
      stories = await prisma.story.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { segments: true, likes: true, comments: true, branches: true } },
        },
      });
    } catch (dbError) {
      // Prisma 连接失败，降级到 JSON 文件存储
      console.warn('Prisma 数据库不可用，降级到 JSON 文件存储:', dbError);
      const jsonStories = await storiesStore.load();
      stories = jsonStories
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((s: any) => ({
          ...s,
          _count: { segments: 0, likes: 0, comments: 0, branches: 0 },
          visibility: 'PUBLIC',
        }));
    }

    return NextResponse.json({
      success: true,
      stories,
      total: stories.length,
    });
  } catch (error) {
    console.error('获取故事列表失败:', error);
    return NextResponse.json(
      { error: '获取故事列表失败' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, author, genre, era, storyType, characters } = body;

    if (!title) {
      return NextResponse.json({ error: '故事标题是必填项' }, { status: 400 });
    }

    const effectiveGenre = genre || undefined; // genre only stores sub-genre label

    const existing = await prisma.story.findFirst({
      where: { title },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        story: existing,
        message: '故事已存在',
      });
    }

    const story = await prisma.story.create({
      data: {
        title,
        description: description || '',
        author: author || '佚名',
        genre: effectiveGenre,
        storyType: storyType || undefined,
        era,
        visibility: 'PUBLIC',
      },
    });

    const firstSegment = await prisma.storySegment.create({
      data: {
        title: `${title}·开篇`,
        content: `《${title}》的故事开始了...`,
        isBranchPoint: false,
        storyId: story.id,
        branchId: 'main',
        parentSegmentId: null,
        imageUrls: [],
        visibility: 'PUBLIC',
      },
    });

    await prisma.story.update({
      where: { id: story.id },
      data: { rootSegmentId: firstSegment.id },
    });

    // 注册前端传入的初始角色
    if (Array.isArray(characters) && characters.length > 0) {
      const characterIds: string[] = [];
      for (const char of characters) {
        if (!char.name || !char.name.trim()) continue;
        // 过滤非中文名
        if (!/[一-鿿]/.test(char.name)) continue;
        try {
          const traits: string[] = [];
          if (Array.isArray(char.traits)) {
            traits.push(...char.traits.filter((t: string) => typeof t === 'string' && t.trim()));
          }
          const role = ['protagonist', 'antagonist', 'supporting', 'narrator'].includes(char.role)
            ? char.role : 'supporting';
          const newChar = await characterManager.create({
            name: char.name.trim(),
            era: era || '',
            role,
            traits,
            storyId: story.id,
          });
          characterIds.push(newChar.id);
        } catch (e) {
          console.warn(`[stories/create] 注册初始角色 "${char.name}" 失败:`, e);
        }
      }
      // 将角色 ID 关联到首段
      if (characterIds.length > 0) {
        await prisma.storySegment.update({
          where: { id: firstSegment.id },
          data: {
            characterIds: characterIds
          },
        });
        await prisma.story.update({
          where: { id: story.id },
          data: {
            characters: {
              set: characterIds.map((id: string) => ({ id }))
            }
          },
        });
      }
    }

    // 同步等待封面图生成，确保在响应前完成
    let coverResult: { success: boolean; coverImageUrl?: string; error?: string } | null = null;
    try {
      coverResult = await generateCoverImage(story.id);
      if (coverResult.success) {
        console.log(`[stories/create] 封面图生成成功: ${coverResult.coverImageUrl}`);
      } else {
        console.warn(`[stories/create] 封面图生成失败: ${coverResult.error}`);
      }
    } catch (e) {
      console.warn('[stories/create] 封面图生成异常:', e);
    }

    // 重新查询故事以获取最新数据（包含封面图）
    const fullStory = await prisma.story.findUnique({ where: { id: story.id } });

    triggerBackup();
    return NextResponse.json({
      success: true,
      story: fullStory,
      firstSegment,
      coverImageUrl: coverResult?.coverImageUrl || undefined,
      message: '故事创建成功，已生成开篇段落',
    }, { status: 201 });
  } catch (error) {
    console.error('创建故事失败:', error);
    return NextResponse.json({ error: '创建故事失败' }, { status: 500 });
  }
}
