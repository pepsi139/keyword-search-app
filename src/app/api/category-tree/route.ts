import { NextResponse } from "next/server";
import { getSubtree } from "@/lib/category-tree";

// 3~6단계 서브트리는 1~2단계(네이버 공식 대분류·소분류)를 고른 뒤에만 필요하므로
// 전체 트리(약 150KB)를 클라이언트 번들에 넣지 않고 이 엔드포인트로 필요한 부분만 내려준다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const l1 = searchParams.get("l1");
  const l2 = searchParams.get("l2");

  if (!l1 || !l2) {
    return NextResponse.json({ error: "l1, l2 파라미터가 필요합니다." }, { status: 400 });
  }

  const subtree = getSubtree(l1, l2);
  if (!subtree) {
    return NextResponse.json({ error: "존재하지 않는 카테고리입니다." }, { status: 404 });
  }

  return NextResponse.json({ subtree });
}
