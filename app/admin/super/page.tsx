"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Business = {
  id: number;
  owner_id: string;
  email: string | null;
  name: string;
  slug: string;
  created_at: string;
  is_super_admin: boolean;
};

export default function SuperAdminPage() {
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    setCheckingAuth(true);
    setMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setMessage("Chyba pri kontrole prihlásenia.");
      setCheckingAuth(false);
      setLoading(false);
      return;
    }

    if (!session) {
      router.replace("/admin/login");
      return;
    }

    const { data: isSuperAdmin, error: superError } =
      await supabase.rpc("is_super_admin");

    if (superError) {
      console.error("SUPER ADMIN ERROR:", superError);

      setMessage(
        "Nepodarilo sa overiť oprávnenie hlavného administrátora."
      );

      setCheckingAuth(false);
      setLoading(false);
      return;
    }

    if (!isSuperAdmin) {
      setMessage(
        "Nemáte oprávnenie na vstup do hlavnej administrácie."
      );

      setCheckingAuth(false);
      setLoading(false);
      return;
    }

    setCheckingAuth(false);

    await loadBusinesses();
  }

  async function loadBusinesses() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc(
      "super_admin_list_businesses"
    );

    if (error) {
      console.error("LOAD BUSINESSES ERROR:", error);

      setMessage(
        "Nepodarilo sa načítať prevádzky: " + error.message
      );

      setLoading(false);
      return;
    }

    setBusinesses((data ?? []) as Business[]);
    setLoading(false);
  }

  async function deleteBusiness(business: Business) {
    if (business.is_super_admin) {
      alert("Hlavného administrátora nie je možné zrušiť.");
      return;
    }

    const confirmed = window.confirm(
      `Naozaj chcete zrušiť prevádzku "${business.name}"?\n\n` +
        `E-mail: ${business.email ?? "bez e-mailu"}\n\n` +
        `Vymaže sa prevádzka, jej služby, pracovné hodiny, rezervácie a prihlasovací účet majiteľa.\n\n` +
        `Túto akciu nie je možné vrátiť späť.`
    );

    if (!confirmed) {
      return;
    }

    const secondConfirmed = window.confirm(
      `Posledné potvrdenie:\n\nNaozaj vymazať "${business.name}"?`
    );

    if (!secondConfirmed) {
      return;
    }

    setDeletingId(business.id);
    setMessage("");

    const { error } = await supabase.rpc(
      "super_admin_delete_business",
      {
        target_business_id: business.id,
      }
    );

    if (error) {
      console.error("DELETE BUSINESS ERROR:", error);

      setMessage(
        "Prevádzku sa nepodarilo zrušiť: " + error.message
      );

      setDeletingId(null);
      return;
    }

    setMessage(
      `✅ Prevádzka "${business.name}" bola zrušená.`
    );

    setDeletingId(null);

    await loadBusinesses();
  }

  async function logout() {
    await supabase.auth.signOut();

    router.replace("/admin/login");
    router.refresh();
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString("sk-SK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-semibold text-gray-700">
          Kontrolujem oprávnenie...
        </p>
      </main>
    );
  }

  if (
    !loading &&
    businesses.length === 0 &&
    message.includes("Nemáte oprávnenie")
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Prístup zamietnutý
          </h1>

          <p className="mt-4 text-red-600">
            {message}
          </p>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mt-6 rounded-xl bg-black px-6 py-3 font-bold text-white"
          >
            Späť do administrácie
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              👑 Hlavný admin
            </h1>

            <p className="mt-2 text-gray-500">
              Správa všetkých zaregistrovaných prevádzok
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="rounded-xl border bg-white px-4 py-3 font-semibold"
            >
              Bežný admin
            </button>

            <button
              type="button"
              onClick={loadBusinesses}
              className="rounded-xl border bg-white px-4 py-3 font-semibold"
            >
              Obnoviť
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-black px-4 py-3 font-semibold text-white"
            >
              Odhlásiť
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-xl bg-white p-4 font-semibold shadow-sm">
            {message}
          </div>
        )}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Zaregistrované prevádzky
              </h2>

              <p className="mt-1 text-gray-500">
                Celkový počet: {businesses.length}
              </p>
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-gray-500">
              Načítavam prevádzky...
            </p>
          ) : businesses.length === 0 ? (
            <div className="mt-6 rounded-xl bg-gray-50 p-5 text-gray-500">
              Nie sú zaregistrované žiadne prevádzky.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Prevádzka</th>
                    <th className="p-3">E-mail</th>
                    <th className="p-3">Link</th>
                    <th className="p-3">Registrácia</th>
                    <th className="p-3">Typ</th>
                    <th className="p-3 text-right">Akcia</th>
                  </tr>
                </thead>

                <tbody>
                  {businesses.map((business) => (
                    <tr
                      key={business.id}
                      className="border-b"
                    >
                      <td className="p-3">
                        <div className="font-bold text-gray-900">
                          {business.name}
                        </div>

                        <div className="text-sm text-gray-500">
                          ID: {business.id}
                        </div>
                      </td>

                      <td className="p-3">
                        {business.email ?? "—"}
                      </td>

                      <td className="p-3">
                        <a
                          href={`/b/${business.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-600 underline"
                        >
                          /b/{business.slug}
                        </a>
                      </td>

                      <td className="p-3">
                        {formatDate(business.created_at)}
                      </td>

                      <td className="p-3">
                        {business.is_super_admin ? (
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-900">
                            👑 Hlavný admin
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                            Admin
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {business.is_super_admin ? (
                          <span className="text-sm font-semibold text-gray-400">
                            Chránené
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              deleteBusiness(business)
                            }
                            disabled={
                              deletingId === business.id
                            }
                            className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white disabled:bg-red-300"
                          >
                            {deletingId === business.id
                              ? "Ruším..."
                              : "Zrušiť"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="rounded-2xl bg-yellow-50 p-5 text-sm text-yellow-900">
          ⚠️ Zrušenie prevádzky odstráni aj jej rezervácie,
          služby, pracovné hodiny a prihlasovací účet majiteľa.
        </div>
      </div>
    </main>
  );
}