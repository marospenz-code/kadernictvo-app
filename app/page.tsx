"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TimeSlot = {
  label: string;
  value: string;
};

type Reservation = {
  id: number;
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

type Confirmation = {
  name: string;
  service: string;
  date: string;
  time: string;
};

const SLOT_MINUTES = 60;

export default function Home() {
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [message, setMessage] = useState("");

  const [confirmation, setConfirmation] =
    useState<Confirmation | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [reservationsResult, hoursResult] = await Promise.all([
      supabase
        .from("reservations")
        .select("id, appointment_time")
        .order("appointment_time", {
          ascending: true,
        }),

      supabase
        .from("business_hours")
        .select("*")
        .order("day_of_week", {
          ascending: true,
        }),
    ]);

    if (reservationsResult.error) {
      console.error(
        "Chyba pri načítaní rezervácií:",
        reservationsResult.error
      );
    } else {
      setReservations(reservationsResult.data || []);
    }

    if (hoursResult.error) {
      console.error(
        "Chyba pri načítaní pracovných hodín:",
        hoursResult.error
      );
    } else {
      setBusinessHours(hoursResult.data || []);
    }

    setLoading(false);
  }

  function normalizeDateTime(value: string) {
    return value.replace("T", " ").substring(0, 16);
  }

  function formatDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(dateValue: string) {
    const [year, month, day] = dateValue.split("-").map(Number);

    return new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0
    ).toLocaleDateString("sk-SK", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getBusinessDayNumber(dateValue: string) {
    const [year, month, day] = dateValue.split("-").map(Number);

    const jsDay = new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0
    ).getDay();

    return jsDay === 0 ? 7 : jsDay;
  }

  function timeToMinutes(value: string) {
    const [hours, minutes] = value
      .substring(0, 5)
      .split(":")
      .map(Number);

    return hours * 60 + minutes;
  }

  function minutesToTime(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }

  function createAppointmentValue(date: string, time: string) {
    return `${date} ${time}:00`;
  }

  function isTimeTaken(time: TimeSlot) {
    const wantedTime = normalizeDateTime(time.value);

    return reservations.some(
      (reservation) =>
        normalizeDateTime(reservation.appointment_time) === wantedTime
    );
  }

  function isTimeInPast(time: TimeSlot) {
    const normalized = normalizeDateTime(time.value);
    const [datePart, timePart] = normalized.split(" ");

    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);

    const appointmentDate = new Date(
      year,
      month - 1,
      day,
      hour,
      minute
    );

    return appointmentDate.getTime() <= Date.now();
  }

  function getBusinessHourForDate(dateValue: string) {
    if (!dateValue) {
      return null;
    }

    const dayNumber = getBusinessDayNumber(dateValue);

    return (
      businessHours.find(
        (item) => Number(item.day_of_week) === dayNumber
      ) || null
    );
  }

  const selectedBusinessHour = useMemo(() => {
    return getBusinessHourForDate(selectedDate);
  }, [selectedDate, businessHours]);

  const availableSlots = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    if (!selectedBusinessHour) {
      return [];
    }

    if (selectedBusinessHour.is_open !== true) {
      return [];
    }

    if (
      !selectedBusinessHour.open_time ||
      !selectedBusinessHour.close_time
    ) {
      return [];
    }

    const startMinutes = timeToMinutes(
      selectedBusinessHour.open_time
    );

    const endMinutes = timeToMinutes(
      selectedBusinessHour.close_time
    );

    const slots: TimeSlot[] = [];

    for (
      let current = startMinutes;
      current < endMinutes;
      current += SLOT_MINUTES
    ) {
      const time = minutesToTime(current);

      const slot: TimeSlot = {
        label: time,
        value: createAppointmentValue(selectedDate, time),
      };

      if (!isTimeTaken(slot) && !isTimeInPast(slot)) {
        slots.push(slot);
      }
    }

    return slots;
  }, [selectedDate, selectedBusinessHour, reservations]);

  const today = useMemo(() => {
    return formatDateKey(new Date());
  }, []);

  function handleDateChange(dateValue: string) {
    setSelectedTime(null);
    setMessage("");

    if (!dateValue) {
      setSelectedDate("");
      return;
    }

    const businessDay = getBusinessHourForDate(dateValue);

    if (!businessDay) {
      setSelectedDate("");

      setMessage(
        "Pre tento deň nie sú nastavené pracovné hodiny."
      );

      return;
    }

    if (businessDay.is_open !== true) {
      setSelectedDate("");

      setMessage(
        `${businessDay.day_name} je kaderníctvo zatvorené. Vyberte iný deň.`
      );

      return;
    }

    setSelectedDate(dateValue);
  }

  async function createReservation() {
    setMessage("");

    if (!selectedService) {
      setMessage("Vyberte službu.");
      return;
    }

    if (!selectedDate) {
      setMessage("Vyberte dátum.");
      return;
    }

    if (!selectedBusinessHour) {
      setMessage(
        "Pre tento deň nie sú nastavené pracovné hodiny."
      );
      return;
    }

    if (selectedBusinessHour.is_open !== true) {
      setMessage("V tento deň je kaderníctvo zatvorené.");
      return;
    }

    if (!selectedTime) {
      setMessage("Vyberte čas.");
      return;
    }

    if (!name.trim()) {
      setMessage("Zadajte meno.");
      return;
    }

    if (!phone.trim()) {
      setMessage("Zadajte telefón.");
      return;
    }

    setSaving(true);

    const dayNumber = getBusinessDayNumber(selectedDate);

    const {
      data: latestBusinessHour,
      error: businessHourError,
    } = await supabase
      .from("business_hours")
      .select("*")
      .eq("day_of_week", dayNumber)
      .maybeSingle();

    if (businessHourError) {
      console.error(businessHourError);

      setMessage(
        "Nepodarilo sa skontrolovať pracovné hodiny."
      );

      setSaving(false);
      return;
    }

    if (!latestBusinessHour) {
      setMessage(
        "Pre tento deň nie sú nastavené pracovné hodiny."
      );

      setSaving(false);
      return;
    }

    if (latestBusinessHour.is_open !== true) {
      setSelectedDate("");
      setSelectedTime(null);

      setMessage(
        `${latestBusinessHour.day_name} je kaderníctvo zatvorené.`
      );

      await loadData();

      setSaving(false);
      return;
    }

    const {
      data: latestReservations,
      error: loadError,
    } = await supabase
      .from("reservations")
      .select("id, appointment_time")
      .order("appointment_time", {
        ascending: true,
      });

    if (loadError) {
      console.error(loadError);

      setMessage(
        "Nepodarilo sa skontrolovať termín."
      );

      setSaving(false);
      return;
    }

    const wantedTime = normalizeDateTime(
      selectedTime.value
    );

    const alreadyTaken = (latestReservations || []).some(
      (reservation) =>
        normalizeDateTime(reservation.appointment_time) ===
        wantedTime
    );

    if (alreadyTaken) {
      setReservations(latestReservations || []);
      setSelectedTime(null);

      setMessage(
        "Tento termín už nie je dostupný."
      );

      setSaving(false);
      return;
    }

    const confirmationData: Confirmation = {
      name: name.trim(),
      service: selectedService,
      date: selectedDate,
      time: selectedTime.label,
    };

    const { error } = await supabase
      .from("reservations")
      .insert([
        {
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          service: selectedService,
          appointment_time: selectedTime.value,
        },
      ]);

    if (error) {
      console.error(
        "Chyba pri ukladaní rezervácie:",
        error
      );

      if (error.code === "23505") {
        setMessage(
          "Tento termín už nie je dostupný."
        );

        await loadData();

        setSelectedTime(null);
        setSaving(false);

        return;
      }

      setMessage(
        "Chyba pri ukladaní rezervácie."
      );

      setSaving(false);
      return;
    }

    setConfirmation(confirmationData);

    setMessage("");

    setName("");
    setPhone("");
    setSelectedService("");
    setSelectedDate("");
    setSelectedTime(null);

    await loadData();

    setSaving(false);
  }

  function createAnotherReservation() {
    setConfirmation(null);
    setMessage("");
    setSelectedService("");
    setSelectedDate("");
    setSelectedTime(null);
    setName("");
    setPhone("");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {confirmation ? (
            <div className="py-4">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                  ✅
                </div>

                <h1 className="mt-5 text-3xl font-bold text-gray-900">
                  Rezervácia potvrdená!
                </h1>

                <p className="mt-2 text-gray-500">
                  Vaša rezervácia bola úspešne vytvorená.
                </p>
              </div>

              <div className="mt-8 rounded-2xl bg-gray-50 p-5">
                <div className="border-b border-gray-200 py-3">
                  <div className="text-sm text-gray-500">
                    Meno
                  </div>

                  <div className="mt-1 font-bold text-gray-900">
                    {confirmation.name}
                  </div>
                </div>

                <div className="border-b border-gray-200 py-3">
                  <div className="text-sm text-gray-500">
                    Služba
                  </div>

                  <div className="mt-1 font-bold text-gray-900">
                    {confirmation.service}
                  </div>
                </div>

                <div className="border-b border-gray-200 py-3">
                  <div className="text-sm text-gray-500">
                    Dátum
                  </div>

                  <div className="mt-1 font-bold capitalize text-gray-900">
                    {formatDisplayDate(confirmation.date)}
                  </div>
                </div>

                <div className="py-3">
                  <div className="text-sm text-gray-500">
                    Čas
                  </div>

                  <div className="mt-1 text-2xl font-bold text-gray-900">
                    {confirmation.time}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-green-50 p-4 text-center text-green-800">
                <div className="font-bold">
                  Ďakujeme za rezerváciu.
                </div>

                <div className="mt-1">
                  Tešíme sa na vašu návštevu. 💈
                </div>
              </div>

              <button
                type="button"
                onClick={createAnotherReservation}
                className="mt-6 w-full rounded-xl bg-black p-4 font-bold text-white transition hover:bg-gray-800"
              >
                Vytvoriť ďalšiu rezerváciu
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900">
                💇 Rezervácia termínu
              </h1>

              <p className="mt-2 text-gray-500">
                Vyberte službu, dátum a voľný čas.
              </p>

              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-900">
                  1. Vyberte službu
                </h2>

                <div className="mt-4 grid gap-3">
                  {[
                    "Strih",
                    "Strih + brada",
                    "Farbenie",
                  ].map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => {
                        setSelectedService(service);
                        setMessage("");
                      }}
                      className={`rounded-xl border p-4 text-left font-semibold transition ${
                        selectedService === service
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-900">
                  2. Vyberte dátum
                </h2>

                <input
                  type="date"
                  min={today}
                  value={selectedDate}
                  disabled={loading}
                  onChange={(e) =>
                    handleDateChange(e.target.value)
                  }
                  className="mt-4 w-full rounded-xl border border-gray-200 bg-white p-4 text-gray-900 outline-none focus:border-black disabled:bg-gray-100"
                />
              </div>

              {selectedDate && (
                <div className="mt-8">
                  <h2 className="text-lg font-bold text-gray-900">
                    3. Vyberte čas
                  </h2>

                  {loading ? (
                    <div className="mt-4 rounded-xl bg-gray-100 p-4 text-center text-gray-500">
                      Načítavam voľné termíny...
                    </div>
                  ) : !selectedBusinessHour ? (
                    <div className="mt-4 rounded-xl bg-gray-100 p-4 text-center font-semibold text-gray-600">
                      Pre tento deň nie sú nastavené pracovné hodiny.
                    </div>
                  ) : selectedBusinessHour.is_open !== true ? (
                    <div className="mt-4 rounded-xl bg-red-50 p-4 text-center font-semibold text-red-700">
                      V tento deň je kaderníctvo zatvorené.
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="mt-4 rounded-xl bg-gray-100 p-4 text-center font-semibold text-gray-600">
                      Na tento deň už nie sú voľné termíny.
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-gray-500">
                        Otvorené{" "}
                        {selectedBusinessHour.open_time?.substring(
                          0,
                          5
                        )}
                        {" – "}
                        {selectedBusinessHour.close_time?.substring(
                          0,
                          5
                        )}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {availableSlots.map((time) => (
                          <button
                            key={time.value}
                            type="button"
                            onClick={() => {
                              setSelectedTime(time);
                              setMessage("");
                            }}
                            className={`rounded-xl p-4 text-center font-semibold transition ${
                              selectedTime?.value === time.value
                                ? "bg-black text-white"
                                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                            }`}
                          >
                            {time.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-900">
                  4. Vaše údaje
                </h2>

                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Meno"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white p-4 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
                  />

                  <input
                    type="tel"
                    placeholder="Telefón"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white p-4 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={createReservation}
                disabled={
                  saving ||
                  loading ||
                  !selectedDate ||
                  !selectedTime ||
                  !selectedBusinessHour ||
                  selectedBusinessHour.is_open !== true
                }
                className="mt-6 w-full rounded-xl bg-black p-4 font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {saving
                  ? "Ukladám..."
                  : "Rezervovať termín"}
              </button>

              {message && (
                <div className="mt-4 rounded-xl bg-gray-100 p-4 text-center font-semibold text-gray-900">
                  {message}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}