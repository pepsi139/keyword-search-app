import { YoutubeSearchPanel } from "./search-panel";

export default function YoutubePage() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-semibold">유튜브 조회수</h1>
      <YoutubeSearchPanel />
    </div>
  );
}
