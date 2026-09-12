export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">개인정보처리방침</h1>
        <p className="mt-2 text-xs text-zinc-500">최종 수정일: 2026년 9월 12일</p>
      </div>

      <p>
        키워드레이더(Keyword Radar, 이하 &quot;서비스&quot;)는 개인/소규모 프로젝트로 운영되는
        키워드 검색량 비교 도구입니다. 본 방침은 서비스 이용 시 수집되는 정보와 그 처리 방식을
        설명합니다.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          1. 수집하는 정보
        </h2>
        <ul className="list-disc pl-5">
          <li>회원가입 시: 이메일 주소 (이메일/비밀번호 가입 또는 Google 로그인 시 이메일, 이름)</li>
          <li>서비스 이용 시: 검색하신 키워드, 검색 시각 (검색량 비교 기능 제공 목적)</li>
          <li>
            브라우저 로컬 저장소(localStorage): 최근 검색어 기록 — 이용자의 브라우저에만
            저장되며 서버로 전송되지 않습니다.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          2. 정보 이용 목적
        </h2>
        <p>
          수집된 정보는 로그인 유지, 검색 결과 제공, 서비스 오류 확인 목적으로만 이용되며,
          광고 목적으로 이용되거나 제3자에게 판매되지 않습니다.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          3. 제3자 API 연동
        </h2>
        <p>
          검색량 데이터를 제공하기 위해 네이버 검색광고 API, 네이버 검색 API, YouTube Data API,
          Google Ads API를 서버 측에서 호출합니다. 이 과정에서 이용자가 입력한 검색 키워드가
          해당 API에 조회 목적으로 전달되며, 이용자의 개인 식별 정보(이메일 등)는 이들 API로
          전송되지 않습니다.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          4. 정보 보관 및 파기
        </h2>
        <p>
          회원 정보는 Supabase(데이터베이스 서비스)에 안전하게 보관되며, 회원 탈퇴 시 지체 없이
          파기됩니다. 검색 키워드 자체는 별도로 영구 저장되지 않고, 검색 결과 조회 목적으로만
          일시적으로 처리됩니다.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          5. 문의
        </h2>
        <p>
          개인정보 관련 문의사항은{" "}
          <a href="mailto:pepsi13911@gmail.com" className="underline">
            pepsi13911@gmail.com
          </a>
          으로 연락 주시기 바랍니다.
        </p>
      </section>
    </div>
  );
}
