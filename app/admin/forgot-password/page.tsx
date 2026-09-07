"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage("Zadajte e-mail.");
      setLoading(false);
      return;
    }

    const redirectTo =
      `${window.location.origin}/admin/reset-password`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

    if (error) {
      console.error("RESET PASSWORD ERROR:", error);

      setErrorMessage(
        "E-mail na obnovenie hesla sa nepodarilo odoslať: " +
          error.message
      );

      setLoading(false);
      return;
    }

    setMessage(
      "Ak je tento e-mail zaregistrovaný, poslali sme naň odkaz na vytvorenie nového hesla."
    );

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">
          Zabudnuté heslo
        </h1>

        <p className="mt-2 text-gray-500">
          Zadajte e-mail, ktorý používate na prihlásenie do
          administrácie.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-semibold text-gray-700"
            >
              E-mail
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.sk"
              autoComplete="email"
              required
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
            {loading
              ? "Odosielam..."
              : "Poslať odkaz na nové heslo"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/admin/login";
          }}
          className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-900"
        >
          Späť na prihlásenie
        </button>
      </div>
    </main>
  );
}