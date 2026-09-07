"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (loading) return;

    setMessage("");

    if (!email.trim()) {
      setMessage("Zadajte email.");
      return;
    }

    if (!password.trim()) {
      setMessage("Zadajte heslo.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        console.error("LOGIN ERROR:", error);

        setMessage(
          "Chyba prihlásenia: " + error.message
        );

        setLoading(false);
        return;
      }

      if (!data.session) {
        setMessage(
          "Prihlásenie prebehlo, ale session nevznikla."
        );

        setLoading(false);
        return;
      }

      setMessage(
        "Prihlásenie úspešné. Otváram administráciu..."
      );

      window.location.href = "/admin";
    } catch (error) {
      console.error("LOGIN EXCEPTION:", error);

      if (error instanceof Error) {
        setMessage(
          "Chyba: " + error.message
        );
      } else {
        setMessage(
          "Neznáma chyba pri prihlásení."
        );
      }

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <h1 className="text-3xl font-bold text-gray-900">
            🔐 Admin prihlásenie
          </h1>

          <p className="mt-2 text-gray-500">
            Prihlásenie kaderníka do administrácie.
          </p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                placeholder="admin@email.sk"
                autoComplete="email"
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full rounded-xl border border-gray-200 p-4 text-gray-900 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Heslo
              </label>

              <input
                type="password"
                value={password}
                placeholder="Heslo"
                autoComplete="current-password"
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    login();
                  }
                }}
                className="w-full rounded-xl border border-gray-200 p-4 text-gray-900 outline-none focus:border-black"
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    "/admin/forgot-password";
                }}
                className="text-sm font-semibold text-gray-700 underline hover:text-black"
              >
                Zabudol som heslo
              </button>
            </div>

            <button
              type="button"
              onClick={login}
              disabled={loading}
              className="w-full rounded-xl bg-black p-4 font-bold text-white hover:bg-gray-800 disabled:bg-gray-400"
            >
              {loading
                ? "Prihlasujem..."
                : "Prihlásiť"}
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/admin/register";
              }}
              className="w-full rounded-xl border border-gray-300 bg-white p-4 font-bold text-gray-900 hover:bg-gray-50"
            >
              Vytvoriť nový účet
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-xl bg-gray-100 p-4 text-center font-semibold text-gray-900">
              {message}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}