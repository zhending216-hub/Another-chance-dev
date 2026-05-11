import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id: storyId } = params;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    const segments = await prisma.storySegment.findMany({
      where: { storyId },
      orderBy: { createdAt: 'asc' },
    });

    const branches = await prisma.storyBranch.findMany({
      where: { storyId },
    });

    // Build main line chain
    const mainSegs = segments.filter((s) => s.branchId === 'main');
    const mainLine: any[] = [];
    const mainSegMap = new Map(mainSegs.map((s) => [s.id, s]));
    const rootSeg = mainSegs.find((s) => !s.parentSegmentId);

    if (rootSeg) {
      const visited = new Set<string>();
      let current: typeof rootSeg | undefined = rootSeg;
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        mainLine.push({ ...current, children: [] as any[] });
        current = mainSegs.find((s) => s.parentSegmentId === current!.id);
      }
    }

    // Attach branches to main line nodes
    for (const branch of branches) {
      const sourceIdx = mainLine.findIndex((s) => s.id === branch.sourceSegmentId);
      if (sourceIdx === -1) continue;

      const branchSegs = segments.filter((s) => s.branchId === branch.id);
      const branchChain: any[] = [];
      const bVisited = new Set<string>();
      let bCur = branchSegs.find((s) => s.parentSegmentId === branch.sourceSegmentId);

      while (bCur && !bVisited.has(bCur.id)) {
        bVisited.add(bCur.id);
        branchChain.push({
          ...bCur,
          branchTitle: branch.title,
          isBranch: true,
          children: [],
        });
        bCur = branchSegs.find((s) => s.parentSegmentId === bCur!.id);
      }

      if (branchChain.length > 0) {
        mainLine[sourceIdx].children.push({
          id: branch.id,
          title: branch.title,
          userDirection: branch.userDirection,
          sourceSegmentId: branch.sourceSegmentId,
          segments: branchChain,
        });
      }
    }

    return NextResponse.json({
      success: true,
      story,
      tree: mainLine,
      branches,
      totalSegments: segments.length,
      totalBranches: branches.length,
    });
  } catch (error) {
    console.error('获取故事树失败:', error);
    return NextResponse.json({ error: '获取故事树失败' }, { status: 500 });
  }
}
