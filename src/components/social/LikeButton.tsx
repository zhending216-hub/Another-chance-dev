'use client';

import { useState } from 'react';

interface LikeButtonProps {
  targetId: string;
  storyId?: string; // Required when type='branch'
  type: 'story' | 'branch';
  initialLiked?: boolean;
  initialCount?: number;
  size?: 'sm' | 'md';
}

export default function LikeButton({ targetId, storyId, type, initialLiked = false, initialCount = 0, size = 'md' }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const apiUrl = type === 'story'
    ? `/api/stories/${targetId}/likes`
    : `/api/stories/${storyId || targetId}/branch/${targetId}/likes`;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setCount((prev) => (data.liked ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch {}
    setLoading(false);
  };

  const isSmall = size === 'sm';
  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1 transition-colors ${
        isSmall ? 'text-xs' : 'text-sm'
      } ${
        liked
          ? 'text-red-500 hover:text-red-600'
          : 'text-[var(--muted)] hover:text-red-400'
      } cursor-pointer`}
      title={liked ? '取消点赞' : '点赞'}
    >
      <span className={liked ? 'scale-110' : ''} style={{ transition: 'transform 0.15s' }}>
        {liked ? '❤️' : '🤍'}
      </span>
      <span className={`min-w-[1ch] text-center ${count === 0 ? 'opacity-0' : ''}`}>{count}</span>
    </button>
  );
}
