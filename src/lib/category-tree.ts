import rawTree from "@/data/naver-category-tree.json";

// 1~2단계는 네이버 공식 분류(naver-directory.ts와 이름이 일치), 3~6단계는
// 서비스에서 직접 설계한 자체 분류다. 트리는 { l1: { l2: { l3: { l4: { l5: [l6...] } } } } } 형태.
type Level6List = string[];
type Level5Map = Record<string, Level6List>;
type Level4Map = Record<string, Level5Map>;
type Level3Map = Record<string, Level4Map>;
type Level2Map = Record<string, Level3Map>;
type CategoryTree = Record<string, Level2Map>;

const TREE = rawTree as CategoryTree;

export type CategorySubtree = Level3Map;

export function getLevel1Names(): string[] {
  return Object.keys(TREE);
}

export function getLevel2Names(l1: string): string[] {
  return Object.keys(TREE[l1] ?? {});
}

// 1~2단계 선택 시점에 3~6단계 서브트리 전체를 한 번에 내려준다 (평균 200여개 리프라 가볍다).
export function getSubtree(l1: string, l2: string): CategorySubtree | null {
  return TREE[l1]?.[l2] ?? null;
}

export function getLevel3Names(subtree: CategorySubtree): string[] {
  return Object.keys(subtree);
}

export function getLevel4Names(subtree: CategorySubtree, l3: string): string[] {
  return Object.keys(subtree[l3] ?? {});
}

export function getLevel5Names(subtree: CategorySubtree, l3: string, l4: string): string[] {
  return Object.keys(subtree[l3]?.[l4] ?? {});
}

export function getLevel6Names(subtree: CategorySubtree, l3: string, l4: string, l5: string): string[] {
  return subtree[l3]?.[l4]?.[l5] ?? [];
}

export function isValidPath(
  l1: string,
  l2: string,
  l3: string,
  l4: string,
  l5: string,
): boolean {
  return Boolean(TREE[l1]?.[l2]?.[l3]?.[l4]?.[l5]);
}
