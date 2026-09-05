export type DirectoryTopic = { seq: number; name: string };
export type DirectorySubGroup = { name: string; topics: DirectoryTopic[] };
export type DirectoryGroup = { seq: number; name: string; subGroups: DirectorySubGroup[] };

// 네이버 블로그 주제판(directorySeq) 매핑. 공식 문서가 없어
// section.blog.naver.com/ajax/DirectoryList.naver 응답을 직접 조회해 확정함.
// 대분류(4개)·소분류(32개)는 네이버 실제 분류이고, 중분류는 네이버에 없는
// 항목이라 소분류를 드롭다운으로 다루기 쉽도록 서비스에서 임의로 묶은 것이다.
export const DIRECTORY_GROUPS: DirectoryGroup[] = [
  {
    seq: 1,
    name: "엔터테인먼트·예술",
    subGroups: [
      {
        name: "영상·방송",
        topics: [
          { seq: 6, name: "영화" },
          { seq: 9, name: "드라마" },
          { seq: 10, name: "방송" },
          { seq: 13, name: "만화·애니" },
        ],
      },
      {
        name: "순수예술·공연",
        topics: [
          { seq: 5, name: "문학·책" },
          { seq: 8, name: "미술·디자인" },
          { seq: 7, name: "공연·전시" },
          { seq: 11, name: "음악" },
        ],
      },
      {
        name: "스타·연예",
        topics: [{ seq: 12, name: "스타·연예인" }],
      },
    ],
  },
  {
    seq: 2,
    name: "생활·노하우·쇼핑",
    subGroups: [
      {
        name: "일상·가족",
        topics: [
          { seq: 14, name: "일상·생각" },
          { seq: 15, name: "육아·결혼" },
          { seq: 16, name: "반려동물" },
          { seq: 17, name: "좋은글·이미지" },
        ],
      },
      {
        name: "뷰티·홈",
        topics: [
          { seq: 18, name: "패션·미용" },
          { seq: 19, name: "인테리어·DIY" },
          { seq: 36, name: "원예·재배" },
        ],
      },
      {
        name: "먹거리·소비",
        topics: [
          { seq: 20, name: "요리·레시피" },
          { seq: 21, name: "상품리뷰" },
        ],
      },
    ],
  },
  {
    seq: 3,
    name: "취미·여가·여행",
    subGroups: [
      {
        name: "취미·액티비티",
        topics: [
          { seq: 22, name: "게임" },
          { seq: 23, name: "스포츠" },
          { seq: 24, name: "사진" },
          { seq: 26, name: "취미" },
          { seq: 25, name: "자동차" },
        ],
      },
      {
        name: "여행·맛집",
        topics: [
          { seq: 27, name: "국내여행" },
          { seq: 28, name: "세계여행" },
          { seq: 29, name: "맛집" },
        ],
      },
    ],
  },
  {
    seq: 4,
    name: "지식·동향",
    subGroups: [
      {
        name: "시사·경제",
        topics: [
          { seq: 31, name: "사회·정치" },
          { seq: 33, name: "비즈니스·경제" },
        ],
      },
      {
        name: "생활지식",
        topics: [
          { seq: 32, name: "건강·의학" },
          { seq: 30, name: "IT·컴퓨터" },
        ],
      },
      {
        name: "학습",
        topics: [
          { seq: 35, name: "어학·외국어" },
          { seq: 34, name: "교육·학문" },
        ],
      },
    ],
  },
];

export function findTopic(directorySeq: number): DirectoryTopic | null {
  for (const group of DIRECTORY_GROUPS) {
    for (const sub of group.subGroups) {
      const topic = sub.topics.find((t) => t.seq === directorySeq);
      if (topic) return topic;
    }
  }
  return null;
}

type DirectoryPostItem = {
  title: string;
  briefContents?: string;
  logNo: number;
};

const REFERER = "https://section.blog.naver.com/BlogHome.naver";

async function fetchDirectoryPage(directorySeq: number, pageNo: number): Promise<DirectoryPostItem[]> {
  const url = `https://section.blog.naver.com/ajax/DirectoryPostList.naver?directorySeq=${directorySeq}&pageNo=${pageNo}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Referer: REFERER,
    },
  });
  if (!res.ok) {
    throw new Error(`네이버 블로그 주제판 조회 오류: ${res.status}`);
  }
  const raw = await res.text();
  const json = raw.startsWith(")]}',") ? raw.slice(5) : raw;
  const data = JSON.parse(json) as { result?: { postList?: DirectoryPostItem[] } };
  return data.result?.postList ?? [];
}

export async function getDirectoryTitles(directorySeq: number, pages = 8): Promise<string[]> {
  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1);
  const results = await Promise.allSettled(
    pageNumbers.map((p) => fetchDirectoryPage(directorySeq, p)),
  );

  const seen = new Set<number>();
  const titles: string[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const post of r.value) {
      if (seen.has(post.logNo)) continue;
      seen.add(post.logNo);
      titles.push(post.title);
    }
  }

  if (titles.length === 0) {
    throw new Error("주제판 글 목록을 가져오지 못했습니다.");
  }

  return titles;
}
