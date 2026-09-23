import { colors } from "../theme";

export type HeadingLevel = "heading" | "subheading";

interface ZineBlockBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface ZineTextBlock extends ZineBlockBase {
  kind: "text";
  text: string;
}

export interface ZineHeadingBlock extends ZineBlockBase {
  kind: "heading";
  text: string;
  level: HeadingLevel;
  color: string;
}

export type ZineBlock = ZineTextBlock | ZineHeadingBlock;

export interface ZinePageData {
  id: string;
  blocks: ZineBlock[];
}

export const ZINE_BLOCK_CAPACITY = 26;
export const TITLE_PAGE_ID = "page-title";

// A content block's x/y/width/height are stored in this fixed virtual page
// size (100 units per inch on an 8.5x11 page) rather than rendered pixels,
// so geometry stays meaningful regardless of zoom or viewport size. The
// renderer scales by (actual page px / VIRTUAL_PAGE_WIDTH) to place it.
export const VIRTUAL_PAGE_WIDTH = 850;
export const VIRTUAL_PAGE_HEIGHT = 1100;

export const MIN_BLOCK_WIDTH = 80;
export const MIN_BLOCK_HEIGHT = 24;

const CONTENT_TOP_MARGIN = 56;
const BLOCK_GAP = 6;
const LINE_HEIGHT_PX = 20;
const BLOCK_VERTICAL_PADDING = 8;
const DEFAULT_BLOCK_X = 68;
const DEFAULT_BLOCK_WIDTH = 714;

const CHARS_PER_LINE = 42;
const DEFAULT_TEXT = "Click edit to add your text here.";

export const HEADING_FONT_SIZE: Record<HeadingLevel, number> = {
  heading: 40,
  subheading: 28,
};
const HEADING_LINE_HEIGHT_PX: Record<HeadingLevel, number> = {
  heading: 48,
  subheading: 34,
};
const HEADING_CHARS_PER_LINE: Record<HeadingLevel, number> = {
  heading: 22,
  subheading: 30,
};
const HEADING_ZB_WEIGHT: Record<HeadingLevel, number> = {
  heading: 2,
  subheading: 1.5,
};
const DEFAULT_HEADING_TEXT: Record<HeadingLevel, string> = {
  heading: "Heading",
  subheading: "Subheading",
};
const DEFAULT_HEADING_COLOR = colors.eggplant;

let idCounter = 0;

function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export function createTitlePage(): ZinePageData {
  return { id: TITLE_PAGE_ID, blocks: [] };
}

export function createBlankPage(): ZinePageData {
  return { id: nextId("page"), blocks: [] };
}

export function estimateTextBlockCost(text: string): number {
  if (text.length === 0) return 1;
  const lines = text
    .split("\n")
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0);
  return Math.max(1, lines);
}

function blockHeightForText(text: string): number {
  return Math.max(MIN_BLOCK_HEIGHT, estimateTextBlockCost(text) * LINE_HEIGHT_PX + BLOCK_VERTICAL_PADDING);
}

function estimateHeadingLines(text: string, level: HeadingLevel): number {
  if (text.length === 0) return 1;
  const charsPerLine = HEADING_CHARS_PER_LINE[level];
  const lines = text
    .split("\n")
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  return Math.max(1, lines);
}

function headingBlockHeightForText(text: string, level: HeadingLevel): number {
  return Math.max(
    MIN_BLOCK_HEIGHT,
    estimateHeadingLines(text, level) * HEADING_LINE_HEIGHT_PX[level] + BLOCK_VERTICAL_PADDING,
  );
}

function stackY(existingBlocks: ZineBlock[]): number {
  return existingBlocks.reduce(
    (bottom, b) => Math.max(bottom, b.y + b.height + BLOCK_GAP),
    CONTENT_TOP_MARGIN,
  );
}

// New blocks stack below the lowest existing block on the page (a sensible
// default position); once created, a block's geometry only changes via an
// explicit drag/resize/tilt or text edit growing its default height never
// happens automatically again -- the box has a size the user controls.
export function createTextBlock(existingBlocks: ZineBlock[]): ZineTextBlock {
  return {
    id: nextId("block"),
    kind: "text",
    text: DEFAULT_TEXT,
    x: DEFAULT_BLOCK_X,
    y: stackY(existingBlocks),
    width: DEFAULT_BLOCK_WIDTH,
    height: blockHeightForText(DEFAULT_TEXT),
    rotation: 0,
  };
}

export function createHeadingBlock(existingBlocks: ZineBlock[], level: HeadingLevel): ZineHeadingBlock {
  const text = DEFAULT_HEADING_TEXT[level];
  return {
    id: nextId("heading"),
    kind: "heading",
    text,
    level,
    color: DEFAULT_HEADING_COLOR,
    x: DEFAULT_BLOCK_X,
    y: stackY(existingBlocks),
    width: DEFAULT_BLOCK_WIDTH,
    height: headingBlockHeightForText(text, level),
    rotation: 0,
  };
}

export function getPageLabel(index: number): string {
  return index === 0 ? "Title Page" : `Page ${index + 1}`;
}

export function estimateBlockCost(block: ZineBlock): number {
  if (block.kind === "heading") {
    return Math.ceil(estimateHeadingLines(block.text, block.level) * HEADING_ZB_WEIGHT[block.level]);
  }
  return estimateTextBlockCost(block.text);
}

export function sumBlockCosts(blocks: ZineBlock[]): number {
  return blocks.reduce((sum, block) => sum + estimateBlockCost(block), 0);
}

export function getPageZineBlockCount(page: ZinePageData): number {
  if (page.id === TITLE_PAGE_ID) return ZINE_BLOCK_CAPACITY;
  return sumBlockCosts(page.blocks);
}
