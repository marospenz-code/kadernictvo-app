"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminRegisterPage() {
  const router = useRouter();

  const [
    businessName,
    setBusinessName,
  ] = useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    repeatPassword,
    setRepeatPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
    setSuccess(false);

    const trimmedBusinessName =
      businessName.trim();

    const trimmedEmail =
      email.trim().toLowerCase();

    if (!trimmedBusinessName) {
      setMessage(
        "Zadajte názov prevádzky."
      );
      return;
    }

    if (!trimmedEmail) {
      setMessage(
        "Zadajte e-mail."
      );
      return;
    }

    if (!password) {
      setMessage(
        "Zadajte heslo."
      );
      return;
    }

    if (password.length < 6) {
      setMessage(
        "Heslo musí mať aspoň 6 znakov."
      );
      return;
    }

    if (
      password !== repeatPassword
    ) {
      setMessage(
        "Heslá sa nezhodujú."
      );
      return;
    }

    const slug =
      createSlug(
        trimmedBusinessName
      );

    if (!slug) {
      setMessage(
        "Z názvu prevádzky sa nepodarilo vytvoriť platný zákaznícky odkaz."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Najskôr skontrolujeme,
       * či už slug neexistuje.
       */
      const {
        data: existingBusiness,
        error: slugError,
      } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (slugError) {
        console.error(
          "SLUG CHECK ERROR:",
          slugError
        );

        setMessage(
          "Nepodarilo sa skontrolovať názov prevádzky: " +
            slugError.message
        );

        return;
      }

      if (existingBusiness) {
        setMessage(
          "Prevádzka s podobným názvom už existuje. Skúste trochu iný názov."
        );

        return;
      }

      /*
       * Vytvorenie používateľa
       * v Supabase Auth.
       */
      const {
        data: signUpData,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            business_name:
              trimmedBusinessName,
            business_slug: slug,
          },
        },
      });

      if (signUpError) {
        console.error(
          "SIGN UP ERROR:",
          signUpError
        );

        setMessage(
          "Registrácia sa nepodarila: " +
            signUpError.message
        );

        return;
      }

      if (!signUpData.user) {
        setMessage(
          "Používateľský účet sa nepodarilo vytvoriť."
        );

        return;
      }

      /*
       * Ak Supabase vyžaduje
       * potvrdenie e-mailu,
       * session zatiaľ neexistuje.
       *
       * Prevádzku preto ešte
       * nevytvárame.
       */
      if (!signUpData.session) {
        setSuccess(true);

        setMessage(
          "✅ Účet bol vytvorený. Skontrolujte e-mail a potvrďte registráciu. Prevádzku dokončíme po prihlásení."
        );

        return;
      }

      const userId =
        signUpData.user.id;

      /*
       * Vytvorenie prevádzky.
       */
      const {
        data: businessData,
        error: businessError,
      } = await supabase
        .from("businesses")
        .insert({
          owner_id: userId,
          name:
            trimmedBusinessName,
          slug,
        })
        .select(
          "id, name, slug"
        )
        .single();

      if (businessError) {
        console.error(
          "BUSINESS INSERT ERROR:",
          businessError
        );

        setMessage(
          "Účet bol vytvorený, ale prevádzku sa nepodarilo vytvoriť: " +
            businessError.message
        );

        return;
      }

      const businessId =
        businessData.id;

      /*
       * Predvolené pracovné hodiny.
       *
       * Pondelok až piatok:
       * 09:00 - 17:00
       *
       * Sobota a nedeľa:
       * zatvorené
       *
       * DÔLEŽITÉ:
       * Nedeľa = 7.
       */
      const defaultHours = [
        {
          business_id:
            businessId,
          day_of_week: 1,
          day_name:
            "Pondelok",
          is_open: true,
          open_time:
            "09:00:00",
          close_time:
            "17:00:00",
        },
        {
          business_id:
            businessId,
          day_of_week: 2,
          day_name:
            "Utorok",
          is_open: true,
          open_time:
            "09:00:00",
          close_time:
            "17:00:00",
        },
        {
          business_id:
            businessId,
          day_of_week: 3,
          day_name:
            "Streda",
          is_open: true,
          open_time:
            "09:00:00",
          close_time:
            "17:00:00",
        },
        {
          business_id:
            businessId,
          day_of_week: 4,
          day_name:
            "Štvrtok",
          is_open: true,
          open_time:
            "09:00:00",
          close_time:
            "17:00:00",
        },
        {
          business_id:
            businessId,
          day_of_week: 5,
          day_name:
            "Piatok",
          is_open: true,
          open_time:
            "09:00:00",
          close_time:
            "17:00:00",
        },
        {
          business_id:
            businessId,
          day_of_week: 6,
          day_name:
            "Sobota",
          is_open: false,
          open_time: null,
          close_time: null,
        },
        {
          business_id:
            businessId,

          // Nedeľa je v našej DB 7
          day_of_week: 7,

          day_name:
            "Nedeľa",
          is_open: false,
          open_time: null,
          close_time: null,
        },
      ];

      const {
        error: hoursError,
      } = await supabase
        .from("business_hours")
        .insert(defaultHours);

      if (hoursError) {
        console.error(
          "HOURS INSERT ERROR:",
          hoursError
        );

        setMessage(
          "Prevádzka bola vytvorená, ale pracovné hodiny sa nepodarilo vytvoriť: " +
            hoursError.message
        );

        return;
      }

      /*
       * Predvolená služba.
       */
      const {
        error: serviceError,
      } = await supabase
        .from("services")
        .insert({
          business_id:
            businessId,
          name: "Strihanie",
          is_active: true,
          sort_order: 1,
          duration_minutes: 60,
        });

      if (serviceError) {
        console.error(
          "SERVICE INSERT ERROR:",
          serviceError
        );

        setMessage(
          "Prevádzka bola vytvorená, ale predvolenú službu sa nepodarilo vytvoriť: " +
            serviceError.message
        );

        return;
      }

      setSuccess(true);

      setMessage(
        "✅ Registrácia bola úspešná. Prevádzka bola vytvorená."
      );

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      setMessage(
        "Pri registrácii nastala neočakávaná chyba."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="text-5xl">
            ✂️
          </div>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Registrácia prevádzky
          </h1>

          <p className="mt-2 text-gray-500">
            Vytvorte si administrátorský účet a vlastnú rezervačnú stránku.
          </p>
        </div>

        {message && (
          <div
            className={`mt-6 rounded-xl p-4 font-semibold ${
              success
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <form
          onSubmit={
            handleRegister
          }
          className="mt-8 space-y-5"
        >
          <div>
            <label className="mb-2 block font-semibold text-gray-900">
              Názov prevádzky
            </label>

            <input
              type="text"
              value={
                businessName
              }
              onChange={(e) =>
                setBusinessName(
                  e.target.value
                )
              }
              placeholder="Napr. Kaderníctvo Maroš"
              autoComplete="organization"
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black"
            />

            {businessName.trim() && (
              <p className="mt-2 text-sm text-gray-500">
                Zákaznícky link:{" "}
                <span className="font-mono font-semibold">
                  /b/
                  {createSlug(
                    businessName
                  )}
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-900">
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="admin@email.sk"
              autoComplete="email"
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-900">
              Heslo
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              placeholder="Minimálne 6 znakov"
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-900">
              Zopakujte heslo
            </label>

            <input
              type="password"
              value={
                repeatPassword
              }
              onChange={(e) =>
                setRepeatPassword(
                  e.target.value
                )
              }
              placeholder="Zopakujte heslo"
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black p-4 font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading
              ? "Vytváram účet..."
              : "Vytvoriť prevádzku"}
          </button>
        </form>

        <div className="mt-6 border-t pt-6 text-center">
          <p className="text-gray-500">
            Už máte účet?
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/login"
              )
            }
            className="mt-2 font-bold text-gray-900 underline"
          >
            Prihlásiť sa
          </button>
        </div>
      </div>
    </main>
  );
}