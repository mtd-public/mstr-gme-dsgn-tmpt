import type { Zine } from "../types";

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const initialZines: Zine[] = [
  {
    id: "z-1",
    title: "Midnight Transmissions",
    favorited: true,
    createdAt: daysAgo(40),
    lastAccessed: daysAgo(1),
  },
  {
    id: "z-2",
    title: "Backyard Botanist",
    favorited: false,
    createdAt: daysAgo(30),
    lastAccessed: daysAgo(6),
  },
  {
    id: "z-3",
    title: "Static & Noise",
    favorited: true,
    createdAt: daysAgo(22),
    lastAccessed: daysAgo(2),
  },
  {
    id: "z-4",
    title: "Corner Store Chronicles",
    favorited: false,
    createdAt: daysAgo(14),
    lastAccessed: daysAgo(14),
  },
  {
    id: "z-5",
    title: "Paper Cuts Vol. 3",
    favorited: false,
    createdAt: daysAgo(5),
    lastAccessed: daysAgo(3),
  },
];
