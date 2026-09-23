import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createBlankPage,
  createHeadingBlock,
  createTextBlock,
  createTitlePage,
  TITLE_PAGE_ID,
  type HeadingLevel,
  type ZineHeadingBlock,
  type ZinePageData,
} from "../data/sections";
import { initialZines } from "../data/mockZines";
import type { GeometryTransform } from "../hooks/useBlockTransform";
import type { Zine, ZineComment } from "../types";

interface ZinesContextValue {
  zines: Zine[];
  favorites: Zine[];
  createZine: (title: string) => Zine;
  toggleFavorite: (id: string) => void;
  touchZine: (id: string) => void;
  getZine: (id: string) => Zine | undefined;
  getComments: (zineId: string) => ZineComment[];
  addComment: (zineId: string, text: string) => void;
  deleteZine: (id: string) => void;
  getPages: (zineId: string) => ZinePageData[];
  addPageAbove: (zineId: string, atIndex: number) => void;
  addPageBelow: (zineId: string, atIndex: number) => void;
  deletePage: (zineId: string, atIndex: number) => void;
  addTextBlock: (zineId: string, pageIndex: number) => void;
  addHeadingBlock: (zineId: string, pageIndex: number, level: HeadingLevel) => void;
  updateBlockText: (zineId: string, pageIndex: number, blockId: string, text: string) => void;
  updateBlockTransform: (
    zineId: string,
    pageIndex: number,
    blockId: string,
    transform: GeometryTransform,
  ) => void;
  updateHeadingStyle: (
    zineId: string,
    pageIndex: number,
    blockId: string,
    patch: Partial<Pick<ZineHeadingBlock, "level" | "color">>,
  ) => void;
  deleteBlock: (zineId: string, pageIndex: number, blockId: string) => void;
}

const ZinesContext = createContext<ZinesContextValue | undefined>(undefined);

export function ZinesProvider({ children }: { children: ReactNode }) {
  const [zines, setZines] = useState<Zine[]>(initialZines);
  const [comments, setComments] = useState<Record<string, ZineComment[]>>({});
  const [pages, setPages] = useState<Record<string, ZinePageData[]>>(() =>
    Object.fromEntries(initialZines.map((z) => [z.id, [createTitlePage()]])),
  );

  const createZine = useCallback((title: string) => {
    const now = new Date().toISOString();
    const zine: Zine = {
      id: `z-${Date.now()}`,
      title,
      favorited: false,
      createdAt: now,
      lastAccessed: now,
    };
    setZines((prev) => [zine, ...prev]);
    setPages((prev) => ({ ...prev, [zine.id]: [createTitlePage()] }));
    return zine;
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setZines((prev) =>
      prev.map((z) => (z.id === id ? { ...z, favorited: !z.favorited } : z)),
    );
  }, []);

  const touchZine = useCallback((id: string) => {
    setZines((prev) =>
      prev.map((z) =>
        z.id === id ? { ...z, lastAccessed: new Date().toISOString() } : z,
      ),
    );
  }, []);

  const getZine = useCallback(
    (id: string) => zines.find((z) => z.id === id),
    [zines],
  );

  const getComments = useCallback(
    (zineId: string) => comments[zineId] ?? [],
    [comments],
  );

  const addComment = useCallback((zineId: string, text: string) => {
    const comment: ZineComment = {
      id: `c-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => ({
      ...prev,
      [zineId]: [...(prev[zineId] ?? []), comment],
    }));
  }, []);

  const getPages = useCallback(
    (zineId: string) => pages[zineId] ?? [createTitlePage()],
    [pages],
  );

  const addPageAbove = useCallback((zineId: string, atIndex: number) => {
    if (atIndex <= 0) return;
    setPages((prev) => {
      const current = prev[zineId] ?? [createTitlePage()];
      const next = [...current];
      next.splice(atIndex, 0, createBlankPage());
      return { ...prev, [zineId]: next };
    });
  }, []);

  const addPageBelow = useCallback((zineId: string, atIndex: number) => {
    setPages((prev) => {
      const current = prev[zineId] ?? [createTitlePage()];
      const next = [...current];
      next.splice(atIndex + 1, 0, createBlankPage());
      return { ...prev, [zineId]: next };
    });
  }, []);

  const deletePage = useCallback((zineId: string, atIndex: number) => {
    if (atIndex <= 0) return;
    setPages((prev) => {
      const current = prev[zineId] ?? [createTitlePage()];
      if (current.length <= 1) return prev;
      const next = current.filter((_, i) => i !== atIndex);
      return { ...prev, [zineId]: next };
    });
  }, []);

  const updatePageAt = useCallback(
    (zineId: string, pageIndex: number, updater: (page: ZinePageData) => ZinePageData) => {
      setPages((prev) => {
        const current = prev[zineId] ?? [createTitlePage()];
        if (pageIndex < 0 || pageIndex >= current.length) return prev;
        const next = current.map((page, i) => (i === pageIndex ? updater(page) : page));
        return { ...prev, [zineId]: next };
      });
    },
    [],
  );

  const addTextBlock = useCallback(
    (zineId: string, pageIndex: number) => {
      updatePageAt(zineId, pageIndex, (page) => {
        if (page.id === TITLE_PAGE_ID) return page;
        return { ...page, blocks: [...page.blocks, createTextBlock(page.blocks)] };
      });
    },
    [updatePageAt],
  );

  const addHeadingBlock = useCallback(
    (zineId: string, pageIndex: number, level: HeadingLevel) => {
      updatePageAt(zineId, pageIndex, (page) => {
        if (page.id === TITLE_PAGE_ID) return page;
        return { ...page, blocks: [...page.blocks, createHeadingBlock(page.blocks, level)] };
      });
    },
    [updatePageAt],
  );

  const updateBlockText = useCallback(
    (zineId: string, pageIndex: number, blockId: string, text: string) => {
      updatePageAt(zineId, pageIndex, (page) => ({
        ...page,
        blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, text } : b)),
      }));
    },
    [updatePageAt],
  );

  const updateBlockTransform = useCallback(
    (zineId: string, pageIndex: number, blockId: string, transform: GeometryTransform) => {
      updatePageAt(zineId, pageIndex, (page) => ({
        ...page,
        blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, ...transform } : b)),
      }));
    },
    [updatePageAt],
  );

  const updateHeadingStyle = useCallback(
    (
      zineId: string,
      pageIndex: number,
      blockId: string,
      patch: Partial<Pick<ZineHeadingBlock, "level" | "color">>,
    ) => {
      updatePageAt(zineId, pageIndex, (page) => ({
        ...page,
        blocks: page.blocks.map((b) => (b.id === blockId && b.kind === "heading" ? { ...b, ...patch } : b)),
      }));
    },
    [updatePageAt],
  );

  const deleteBlock = useCallback(
    (zineId: string, pageIndex: number, blockId: string) => {
      updatePageAt(zineId, pageIndex, (page) => ({
        ...page,
        blocks: page.blocks.filter((b) => b.id !== blockId),
      }));
    },
    [updatePageAt],
  );

  const deleteZine = useCallback((id: string) => {
    setZines((prev) => prev.filter((z) => z.id !== id));
    setComments((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPages((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const favorites = useMemo(() => zines.filter((z) => z.favorited), [zines]);

  const value = useMemo(
    () => ({
      zines,
      favorites,
      createZine,
      toggleFavorite,
      touchZine,
      getZine,
      getComments,
      addComment,
      deleteZine,
      getPages,
      addPageAbove,
      addPageBelow,
      deletePage,
      addTextBlock,
      addHeadingBlock,
      updateBlockText,
      updateBlockTransform,
      updateHeadingStyle,
      deleteBlock,
    }),
    [
      zines,
      favorites,
      createZine,
      toggleFavorite,
      touchZine,
      getZine,
      getComments,
      addComment,
      deleteZine,
      getPages,
      addPageAbove,
      addPageBelow,
      deletePage,
      addTextBlock,
      addHeadingBlock,
      updateBlockText,
      updateBlockTransform,
      updateHeadingStyle,
      deleteBlock,
    ],
  );

  return <ZinesContext.Provider value={value}>{children}</ZinesContext.Provider>;
}

export function useZines() {
  const ctx = useContext(ZinesContext);
  if (!ctx) throw new Error("useZines must be used within a ZinesProvider");
  return ctx;
}
