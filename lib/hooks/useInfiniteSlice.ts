/**
 * useInfiniteSlice - 切片式无限滚动 hook
 *
 * 管理 visibleCount 与触发加载更多的 IntersectionObserver。
 * 调用方自己对完整列表做 slice(0, visibleCount)，hook 不接管 slice 计算。
 *
 * 使用 callback-ref 模式：触发器节点 mount 时创建并启动 observer，
 * unmount 时 disconnect。observer 命中后 setVisibleCount(prev + pageSize)，
 * 触发重渲染但节点本身不变，observer 持续观察，行为等价于"每次可见即加载下一页"。
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface UseInfiniteSliceOptions {
  /** 每次加载的条目数，默认 24 */
  pageSize?: number;
  /** IntersectionObserver rootMargin，默认 '400px'（对齐搜索结果预加载距离） */
  rootMargin?: string;
  /** IntersectionObserver threshold，默认 0 */
  threshold?: number;
  /** 初始 visibleCount，默认等于 pageSize */
  initial?: number;
}

interface UseInfiniteSliceResult {
  visibleCount: number;
  hasMore: boolean;
  loadMoreRef: (node: HTMLElement | null) => void;
  setVisibleCount: Dispatch<SetStateAction<number>>;
}

export function useInfiniteSlice(
  total: number,
  options: UseInfiniteSliceOptions = {}
): UseInfiniteSliceResult {
  const {
    pageSize = 24,
    rootMargin = '400px',
    threshold = 0,
    initial = pageSize,
  } = options;

  const [visibleCount, setVisibleCount] = useState(initial);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleCount((prev) => prev + pageSize);
          }
        },
        { rootMargin, threshold }
      );
      observer.observe(node);
      observerRef.current = observer;
    }
  }, [pageSize, rootMargin, threshold]);

  return {
    visibleCount,
    hasMore: total > visibleCount,
    loadMoreRef,
    setVisibleCount,
  };
}
