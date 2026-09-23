export interface Zine {
  id: string;
  title: string;
  favorited: boolean;
  createdAt: string;
  lastAccessed: string;
}

export interface ZineComment {
  id: string;
  text: string;
  createdAt: string;
}
