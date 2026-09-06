"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Reservation = {
  id: number;
  customer_name: string;
  customer_phone: string;
  service: string;
  appointment_time: string;
};

type BusinessHour = {
  id: number;
  day_of_week: number;
  day_name: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

const SERVICES = [
  "Strih",
  "Strih + brada",
  "Farbenie",
];

const SLOT_MINUTES = 60;

export default function AdminPage() {
  const router = useRouter();

  const [reservations, setReservations] =
    useState<Reservation[]>([]);

  const [businessHours, setBusinessHours] =
    useState<BusinessHour[]>([]);

  const [selectedDate, setSelectedDate] =
    useState("");

  const [currentMonth, setCurrentMonth] =
    useState(new Date());

  const [loading, setLoading] =
    useState(true);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [manualName, setManualName] =
    useState("");

  const [manualPhone, setManualPhone] =
    useState("");

  const [manualService, setManualService] =
    useState("Strih");

  const [manualDate, setManualDate] =
    useState("");

  const [manualTime, setManualTime] =
    useState("");

  const [
    addingReservation,
    setAddingReservation,
  ] = useState(false);

  useEffect(() => {
    checkLogin();
  }, []);

  async function checkLogin() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error(
        "AUTH ERROR:",
        error
      );
    }

    if (!session) {
      router.replace(
        "/admin/login"
      );
      return;
    }

    setCheckingAuth(false);

    await loadData();
  }

  async function loadData() {
    setLoading(true);
    setMessage("");

    const reservationsResult =
      await supabase
        .from("reservations")
        .select("*")
        .order(
          "appointment_time",
          {
            ascending: true,
          }
        );

    if (
      reservationsResult.error
    ) {
      console.error(
        "RESERVATIONS ERROR:",
        reservationsResult.error
      );

      setMessage(
        "Chyba pri načítaní rezervácií: " +
          reservationsResult.error.message
      );
    } else {
      setReservations(
        reservationsResult.data ??
          []
      );
    }

    const hoursResult =
      await supabase
        .from("business_hours")
        .select("*")
        .order(
          "day_of_week",
          {
            ascending: true,
          }
        );

    if (hoursResult.error) {
      console.error(
        "BUSINESS HOURS ERROR:",
        hoursResult.error
      );

      setMessage(
        "Chyba pri načítaní pracovných hodín: " +
          hoursResult.error.message
      );
    } else {
      setBusinessHours(
        hoursResult.data ?? []
      );
    }

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();

    router.replace(
      "/admin/login"
    );

    router.refresh();
  }

  async function deleteReservation(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "Naozaj chcete zrušiť túto rezerváciu?"
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from("reservations")
        .delete()
        .eq("id", id);

    if (error) {
      setMessage(
        "Rezerváciu sa nepodarilo zrušiť: " +
          error.message
      );

      return;
    }

    setMessage(
      "Rezervácia bola zrušená."
    );

    await loadData();
  }

  function updateBusinessHour(
    index: number,
    field: keyof BusinessHour,
    value: string | boolean
  ) {
    setBusinessHours(
      (current) => {
        const copy = [
          ...current,
        ];

        copy[index] = {
          ...copy[index],
          [field]: value,
        };

        return copy;
      }
    );
  }

  async function saveBusinessHour(
    item: BusinessHour
  ) {
    const { error } =
      await supabase
        .from("business_hours")
        .update({
          is_open:
            item.is_open,

          open_time:
            item.is_open
              ? item.open_time
              : null,

          close_time:
            item.is_open
              ? item.close_time
              : null,
        })
        .eq(
          "day_of_week",
          item.day_of_week
        );

    if (error) {
      setMessage(
        "Pracovné hodiny sa nepodarilo uložiť: " +
          error.message
      );

      return;
    }

    setMessage(
      `${item.day_name} bol uložený.`
    );

    await loadData();
  }

  function formatDate(
    date: Date
  ) {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatReservationDate(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleString(
      "sk-SK",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    );
  }

  function formatReservationTime(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleTimeString(
      "sk-SK",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function getBusinessDayNumber(
    dateValue: string
  ) {
    if (!dateValue) {
      return 0;
    }

    const [
      year,
      month,
      day,
    ] = dateValue
      .split("-")
      .map(Number);

    const jsDay =
      new Date(
        year,
        month - 1,
        day
      ).getDay();

    return jsDay === 0
      ? 7
      : jsDay;
  }

  function timeToMinutes(
    time: string
  ) {
    const [hours, minutes] =
      time
        .slice(0, 5)
        .split(":")
        .map(Number);

    return (
      hours * 60 + minutes
    );
  }

  function minutesToTime(
    minutes: number
  ) {
    const hours =
      Math.floor(
        minutes / 60
      );

    const mins =
      minutes % 60;

    return `${String(
      hours
    ).padStart(
      2,
      "0"
    )}:${String(
      mins
    ).padStart(
      2,
      "0"
    )}`;
  }

  const manualBusinessHour =
    useMemo(() => {
      if (!manualDate) {
        return null;
      }

      const dayNumber =
        getBusinessDayNumber(
          manualDate
        );

      return (
        businessHours.find(
          (item) =>
            Number(
              item.day_of_week
            ) === dayNumber
        ) ?? null
      );
    }, [
      manualDate,
      businessHours,
    ]);

  const manualAvailableTimes =
    useMemo(() => {
      if (
        !manualDate ||
        !manualBusinessHour ||
        !manualBusinessHour.is_open ||
        !manualBusinessHour.open_time ||
        !manualBusinessHour.close_time
      ) {
        return [];
      }

      const start =
        timeToMinutes(
          manualBusinessHour.open_time
        );

      const end =
        timeToMinutes(
          manualBusinessHour.close_time
        );

      const allSlots: string[] =
        [];

      for (
        let minutes = start;
        minutes +
            SLOT_MINUTES <=
          end;
        minutes +=
          SLOT_MINUTES
      ) {
        allSlots.push(
          minutesToTime(
            minutes
          )
        );
      }

      const bookedTimes =
        reservations
          .filter(
            (reservation) =>
              reservation.appointment_time.slice(
                0,
                10
              ) ===
              manualDate
          )
          .map(
            (reservation) => {
              const date =
                new Date(
                  reservation.appointment_time
                );

              return `${String(
                date.getHours()
              ).padStart(
                2,
                "0"
              )}:${String(
                date.getMinutes()
              ).padStart(
                2,
                "0"
              )}`;
            }
          );

      return allSlots.filter(
        (time) =>
          !bookedTimes.includes(
            time
          )
      );
    }, [
      manualDate,
      manualBusinessHour,
      reservations,
    ]);

  async function addManualReservation() {
    if (
      addingReservation
    ) {
      return;
    }

    setMessage("");

    if (!manualName.trim()) {
      setMessage(
        "Zadajte meno zákazníka."
      );
      return;
    }

    if (
      !manualPhone.trim()
    ) {
      setMessage(
        "Zadajte telefón zákazníka."
      );
      return;
    }

    if (!manualDate) {
      setMessage(
        "Vyberte dátum rezervácie."
      );
      return;
    }

    if (
      !manualBusinessHour ||
      !manualBusinessHour.is_open
    ) {
      setMessage(
        "V tento deň je kaderníctvo zatvorené."
      );
      return;
    }

    if (!manualTime) {
      setMessage(
        "Vyberte voľný čas."
      );
      return;
    }

    setAddingReservation(
      true
    );

    try {
      const {
        data:
          latestReservations,
        error:
          latestError,
      } = await supabase
        .from(
          "reservations"
        )
        .select("*");

      if (latestError) {
        setMessage(
          "Nepodarilo sa overiť voľný termín: " +
            latestError.message
        );

        return;
      }

      const alreadyBooked =
        (
          latestReservations ??
          []
        ).some(
          (
            reservation:
              Reservation
          ) => {
            if (
              reservation.appointment_time.slice(
                0,
                10
              ) !==
              manualDate
            ) {
              return false;
            }

            const date =
              new Date(
                reservation.appointment_time
              );

            const time =
              `${String(
                date.getHours()
              ).padStart(
                2,
                "0"
              )}:${String(
                date.getMinutes()
              ).padStart(
                2,
                "0"
              )}`;

            return (
              time ===
              manualTime
            );
          }
        );

      if (alreadyBooked) {
        setMessage(
          "Tento termín už medzičasom niekto obsadil."
        );

        await loadData();

        setManualTime("");

        return;
      }

      const appointmentTime =
        `${manualDate}T${manualTime}:00`;

      const {
        error: insertError,
      } = await supabase
        .from(
          "reservations"
        )
        .insert({
          customer_name:
            manualName.trim(),

          customer_phone:
            manualPhone.trim(),

          service:
            manualService,

          appointment_time:
            appointmentTime,
        });

      if (insertError) {
        if (
          insertError.code ===
          "23505"
        ) {
          setMessage(
            "Tento termín je už obsadený."
          );
        } else {
          setMessage(
            "Rezerváciu sa nepodarilo vytvoriť: " +
              insertError.message
          );
        }

        return;
      }

      setMessage(
        "✅ Rezervácia bola úspešne pridaná."
      );

      setManualName("");
      setManualPhone("");
      setManualTime("");

      setSelectedDate(
        manualDate
      );

      await loadData();
    } catch (error) {
      console.error(
        "MANUAL RESERVATION ERROR:",
        error
      );

      setMessage(
        "Nastala chyba pri vytváraní rezervácie."
      );
    } finally {
      setAddingReservation(
        false
      );
    }
  }

  function previousMonth() {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() -
          1,
        1
      )
    );
  }

  function nextMonth() {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() +
          1,
        1
      )
    );
  }

  function goToday() {
    const today =
      new Date();

    setCurrentMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    setSelectedDate(
      formatDate(today)
    );
  }

  const todayString =
    formatDate(new Date());

  const todayReservations =
    useMemo(() => {
      return reservations
        .filter(
          (reservation) =>
            reservation.appointment_time.slice(
              0,
              10
            ) ===
            todayString
        )
        .sort(
          (a, b) =>
            new Date(
              a.appointment_time
            ).getTime() -
            new Date(
              b.appointment_time
            ).getTime()
        );
    }, [
      reservations,
      todayString,
    ]);

  const monthName =
    currentMonth.toLocaleDateString(
      "sk-SK",
      {
        month: "long",
        year: "numeric",
      }
    );

  const calendarDays =
    useMemo(() => {
      const year =
        currentMonth.getFullYear();

      const month =
        currentMonth.getMonth();

      const firstDay =
        new Date(
          year,
          month,
          1
        );

      const lastDay =
        new Date(
          year,
          month + 1,
          0
        );

      let startDay =
        firstDay.getDay();

      if (
        startDay === 0
      ) {
        startDay = 7;
      }

      const days:
        Array<Date | null> =
        [];

      for (
        let i = 1;
        i < startDay;
        i++
      ) {
        days.push(null);
      }

      for (
        let day = 1;
        day <=
        lastDay.getDate();
        day++
      ) {
        days.push(
          new Date(
            year,
            month,
            day
          )
        );
      }

      return days;
    }, [currentMonth]);

  const selectedReservations =
    useMemo(() => {
      if (!selectedDate) {
        return [];
      }

      return reservations.filter(
        (reservation) =>
          reservation.appointment_time.slice(
            0,
            10
          ) ===
          selectedDate
      );
    }, [
      reservations,
      selectedDate,
    ]);

  function countReservationsForDate(
    date: Date
  ) {
    const dateString =
      formatDate(date);

    return reservations.filter(
      (reservation) =>
        reservation.appointment_time.slice(
          0,
          10
        ) ===
        dateString
    ).length;
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-semibold text-gray-700">
          Kontrolujem prihlásenie...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              💈 Administrácia
            </h1>

            <p className="mt-2 text-gray-500">
              Rezervácie a pracovné hodiny
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={
                loadData
              }
              className="rounded-xl border bg-white px-4 py-3 font-semibold"
            >
              Obnoviť
            </button>

            <button
              type="button"
              onClick={
                logout
              }
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
          <h2 className="text-2xl font-bold text-gray-900">
            📅 Dnešné rezervácie
          </h2>

          <p className="mt-2 text-gray-500">
            {new Date().toLocaleDateString(
              "sk-SK",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            )}
          </p>

          {todayReservations.length ===
          0 ? (
            <div className="mt-6 rounded-xl bg-gray-50 p-5 text-gray-500">
              Na dnes nie sú žiadne rezervácie.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {todayReservations.map(
                (reservation) => (
                  <div
                    key={
                      reservation.id
                    }
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">

                      <div className="text-2xl font-bold text-gray-900">
                        {formatReservationTime(
                          reservation.appointment_time
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-gray-900">
                          {
                            reservation.customer_name
                          }
                        </div>

                        <div className="text-gray-500">
                          {
                            reservation.service
                          }
                        </div>

                        <div className="text-sm text-gray-500">
                          {
                            reservation.customer_phone
                          }
                        </div>
                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteReservation(
                          reservation.id
                        )
                      }
                      className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
                    >
                      Zrušiť
                    </button>

                  </div>
                )
              )}
            </div>
          )}
        </section>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-2xl font-bold text-gray-900">
            ➕ Pridať rezerváciu
          </h2>

          <p className="mt-2 text-gray-500">
            Manuálne vytvorenie rezervácie pre zákazníka.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            <div>
              <label className="mb-2 block font-semibold">
                Meno zákazníka
              </label>

              <input
                type="text"
                value={
                  manualName
                }
                onChange={(
                  e
                ) =>
                  setManualName(
                    e.target.value
                  )
                }
                placeholder="Ján Novák"
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Telefón
              </label>

              <input
                type="tel"
                value={
                  manualPhone
                }
                onChange={(
                  e
                ) =>
                  setManualPhone(
                    e.target.value
                  )
                }
                placeholder="+421..."
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Služba
              </label>

              <select
                value={
                  manualService
                }
                onChange={(
                  e
                ) =>
                  setManualService(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border p-3"
              >
                {SERVICES.map(
                  (service) => (
                    <option
                      key={
                        service
                      }
                      value={
                        service
                      }
                    >
                      {
                        service
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Dátum
              </label>

              <input
                type="date"
                value={
                  manualDate
                }
                onChange={(
                  e
                ) => {
                  setManualDate(
                    e.target.value
                  );

                  setManualTime(
                    ""
                  );
                }}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Čas
              </label>

              <select
                value={
                  manualTime
                }
                onChange={(
                  e
                ) =>
                  setManualTime(
                    e.target.value
                  )
                }
                disabled={
                  !manualDate ||
                  !manualBusinessHour?.is_open
                }
                className="w-full rounded-xl border p-3 disabled:bg-gray-100"
              >

                <option value="">
                  Vyberte čas
                </option>

                {manualAvailableTimes.map(
                  (time) => (
                    <option
                      key={
                        time
                      }
                      value={
                        time
                      }
                    >
                      {
                        time
                      }
                    </option>
                  )
                )}

              </select>
            </div>

          </div>

          {manualDate &&
            manualBusinessHour &&
            !manualBusinessHour.is_open && (
              <div className="mt-4 rounded-xl bg-red-50 p-4 font-semibold text-red-700">
                V tento deň je kaderníctvo zatvorené.
              </div>
            )}

          {manualDate &&
            manualBusinessHour?.is_open &&
            manualAvailableTimes.length ===
              0 && (
              <div className="mt-4 rounded-xl bg-yellow-50 p-4 font-semibold">
                Na tento deň už nie sú voľné termíny.
              </div>
            )}

          <button
            type="button"
            onClick={
              addManualReservation
            }
            disabled={
              addingReservation
            }
            className="mt-6 rounded-xl bg-black px-6 py-3 font-bold text-white disabled:bg-gray-400"
          >
            {addingReservation
              ? "Pridávam..."
              : "Pridať rezerváciu"}
          </button>

        </section>

        <div className="grid gap-6 lg:grid-cols-2">

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <div className="mb-6 flex items-center justify-between">

              <button
                type="button"
                onClick={
                  previousMonth
                }
                className="rounded-lg border px-3 py-2"
              >
                ←
              </button>

              <h2 className="text-xl font-bold capitalize">
                {
                  monthName
                }
              </h2>

              <button
                type="button"
                onClick={
                  nextMonth
                }
                className="rounded-lg border px-3 py-2"
              >
                →
              </button>

            </div>

            <button
              type="button"
              onClick={
                goToday
              }
              className="mb-4 rounded-lg bg-gray-100 px-4 py-2 font-semibold"
            >
              Dnes
            </button>

            <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-gray-500">
              <div>Po</div>
              <div>Ut</div>
              <div>St</div>
              <div>Št</div>
              <div>Pi</div>
              <div>So</div>
              <div>Ne</div>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">

              {calendarDays.map(
                (
                  date,
                  index
                ) => {
                  if (
                    !date
                  ) {
                    return (
                      <div
                        key={
                          index
                        }
                        className="h-20"
                      />
                    );
                  }

                  const dateString =
                    formatDate(
                      date
                    );

                  const count =
                    countReservationsForDate(
                      date
                    );

                  const selected =
                    dateString ===
                    selectedDate;

                  return (
                    <button
                      key={
                        dateString
                      }
                      type="button"
                      onClick={() =>
                        setSelectedDate(
                          dateString
                        )
                      }
                      className={`h-20 rounded-xl border p-2 text-left ${
                        selected
                          ? "bg-black text-white"
                          : "bg-white"
                      }`}
                    >

                      <div className="font-bold">
                        {
                          date.getDate()
                        }
                      </div>

                      {count >
                        0 && (
                        <div className="mt-1 text-xs">
                          {
                            count
                          }{" "}
                          rez.
                        </div>
                      )}

                    </button>
                  );
                }
              )}

            </div>

          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              Rezervácie
            </h2>

            {!selectedDate && (
              <p className="mt-4 text-gray-500">
                Kliknite na deň v kalendári.
              </p>
            )}

            {selectedDate &&
              selectedReservations.length ===
                0 && (
                <p className="mt-4 text-gray-500">
                  Na tento deň nie sú rezervácie.
                </p>
              )}

            <div className="mt-4 space-y-4">

              {selectedReservations.map(
                (
                  reservation
                ) => (
                  <div
                    key={
                      reservation.id
                    }
                    className="rounded-xl border p-4"
                  >

                    <div className="font-bold">
                      {
                        reservation.customer_name
                      }
                    </div>

                    <div>
                      {
                        reservation.customer_phone
                      }
                    </div>

                    <div>
                      {
                        reservation.service
                      }
                    </div>

                    <div className="font-semibold">
                      {formatReservationDate(
                        reservation.appointment_time
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteReservation(
                          reservation.id
                        )
                      }
                      className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
                    >
                      Zrušiť rezerváciu
                    </button>

                  </div>
                )
              )}

            </div>

          </section>

        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-2xl font-bold">
            Pracovné hodiny
          </h2>

          {loading ? (
            <p className="mt-6">
              Načítavam...
            </p>
          ) : (
            <div className="mt-6 space-y-4">

              {businessHours.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={
                      item.day_of_week
                    }
                    className="grid gap-4 rounded-xl border p-4 md:grid-cols-5 md:items-center"
                  >

                    <div className="font-bold">
                      {
                        item.day_name
                      }
                    </div>

                    <label className="flex items-center gap-2">

                      <input
                        type="checkbox"
                        checked={
                          item.is_open
                        }
                        onChange={(
                          e
                        ) =>
                          updateBusinessHour(
                            index,
                            "is_open",
                            e
                              .target
                              .checked
                          )
                        }
                      />

                      Otvorené
                    </label>

                    <input
                      type="time"
                      value={
                        item.open_time?.slice(
                          0,
                          5
                        ) ?? ""
                      }
                      disabled={
                        !item.is_open
                      }
                      onChange={(
                        e
                      ) =>
                        updateBusinessHour(
                          index,
                          "open_time",
                          e
                            .target
                            .value
                        )
                      }
                      className="rounded-lg border p-3 disabled:bg-gray-100"
                    />

                    <input
                      type="time"
                      value={
                        item.close_time?.slice(
                          0,
                          5
                        ) ?? ""
                      }
                      disabled={
                        !item.is_open
                      }
                      onChange={(
                        e
                      ) =>
                        updateBusinessHour(
                          index,
                          "close_time",
                          e
                            .target
                            .value
                        )
                      }
                      className="rounded-lg border p-3 disabled:bg-gray-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        saveBusinessHour(
                          item
                        )
                      }
                      className="rounded-lg bg-black px-4 py-3 font-semibold text-white"
                    >
                      Uložiť
                    </button>

                  </div>
                )
              )}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}