"use client";

import { useActionState, useState } from "react";
import { login, signup, signInWithGoogle } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    undefined,
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    undefined,
  );

  const state = mode === "login" ? loginState : signupState;
  const action = mode === "login" ? loginAction : signupAction;
  const pending = mode === "login" ? loginPending : signupPending;

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-black/[.08] bg-white p-8 dark:border-white/[.12] dark:bg-zinc-950">
      <div className="flex rounded-lg bg-black/[.04] p-1 dark:bg-white/[.06]">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "login"
              ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
              : "text-zinc-500"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
              : "text-zinc-500"
          }`}
        >
          회원가입
        </button>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/[.16] dark:focus:border-white"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="6자 이상"
            className="rounded-md border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/[.16] dark:focus:border-white"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p className="text-sm text-green-600 dark:text-green-400">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {pending ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.12]" />
        또는
        <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.12]" />
      </div>

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-black/[.12] py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.16] dark:hover:bg-white/[.06]"
        >
          Google로 계속하기
        </button>
      </form>
    </div>
  );
}
