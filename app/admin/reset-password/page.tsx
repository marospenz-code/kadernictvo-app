"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkRecoverySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setCanReset(true);
      }

      setChecking(false);
    }

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setCanReset(true);
        setChecking(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage(
        "Nové heslo musí mať minimálne 6 znakov."
      );
      return;
    }

    if (password !== repeatPassword) {
      setErrorMessage("Heslá sa nezhodujú.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("UPDATE PASSWORD ERROR:", error);

      setErrorMessage(
        "Heslo sa nepodarilo zmeniť: " + error.message
      );

      setLoading(false);
      return;
    }

    setMessage("✅ Heslo bolo úspešne zmenené.");
    setLoading(false);

    setTimeout(async () => {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      router.refresh();
    }, 1500);
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="font-semibold text-gray-700">
          Kontrolujem odkaz...
        </p>
      </main>
    );
  }

  if (!canReset) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Odkaz nie je platný
          </h1>

          <p className="mt-4 text-gray-500">
            Odkaz na zmenu hesla je neplatný alebo jeho platnosť
            vypršala.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/admin/forgot-password")
            }
            className="mt-6 w-full rounded-xl bg-black px-4 py-3 font-bold text-white"
          >
            Poslať nový odkaz
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">
          Nové heslo
        </h1>

        <p className="mt-2 text-gray-500">
          Zadajte nové heslo pre svoj účet.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-semibold text-gray-700"
            >
              Nové heslo
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label
              htmlFor="repeatPassword"
              className="mb-2 block font-semibold text-gray-700"
            >
              Zopakujte nové heslo
            </label>

            <input
              id="repeatPassword"
              type="password"
              value={repeatPassword}
              onChange={(e) =>
                setRepeatPassword(e.target.value)
              }
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black px-4 py-3 font-bold text-white disabled:bg-gray-400"
          >
            {loading ? "Ukladám..." : "Nastaviť nové heslo"}
          </button>
        </form>
      </div>
    </main>
  );
}