"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Business = {
  id: number;
  name: string;
  slug: string;
};

type Service = {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
  duration_minutes: number;
  business_id: number;
};

type BusinessHour = {
  id: number;
  day_of_week: number;
  day_name?: string | null;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  business_id: number;
};

type AvailabilityReservation = {
  business_id: number;
  appointment_time: string;
  duration_minutes: number;
};

type TimeSlot = {
  label: string;
  value: string;
};

type Confirmation = {
  name: string;
  email: string;
  service: string;
  date: string;
  time: string;
  duration: number;
};

const SLOT_INTERVAL_MINUTES = 15;

export default function BusinessBookingPage() {
  const params = useParams();

  const slug =
    typeof params.slug === "string"
      ? params.slug
      : "";

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [services, setServices] =
    useState<Service[]>([]);

  const [
    businessHours,
    setBusinessHours,
  ] = useState<BusinessHour[]>([]);

  const [
    reservations,
    setReservations,
  ] = useState<
    AvailabilityReservation[]
  >([]);

  const [
    selectedService,
    setSelectedService,
  ] = useState("");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    selectedTime,
    setSelectedTime,
  ] = useState<TimeSlot | null>(null);

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    confirmation,
    setConfirmation,
  ] =
    useState<Confirmation | null>(
      null
    );

  const [
    businessNotFound,
    setBusinessNotFound,
  ] = useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }

    loadBusiness();
  }, [slug]);

  async function loadBusiness() {
    setLoading(true);
    setMessage("");
    setBusinessNotFound(false);

    const {
      data: businessData,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (businessError) {
      console.error(
        "BUSINESS ERROR:",
        businessError
      );

      setMessage(
        "Nepodarilo sa načítať prevádzku."
      );

      setLoading(false);
      return;
    }

    if (!businessData) {
      setBusinessNotFound(true);
      setLoading(false);
      return;
    }

    const loadedBusiness =
      businessData as Business;

    setBusiness(loadedBusiness);

    await loadBusinessData(
      loadedBusiness.id
    );

    setLoading(false);
  }

  async function loadBusinessData(
    businessId: number
  ) {
    const [
      servicesResult,
      hoursResult,
      reservationsResult,
    ] = await Promise.all([
      supabase
        .from("services")
        .select(
          "id, name, is_active, sort_order, duration_minutes, business_id"
        )
        .eq(
          "business_id",
          businessId
        )
        .eq(
          "is_active",
          true
        )
        .order(
          "sort_order",
          {
            ascending: true,
          }
        )
        .order(
          "id",
          {
            ascending: true,
          }
        ),

      supabase
        .from(
          "business_hours"
        )
        .select("*")
        .eq(
          "business_id",
          businessId
        )
        .order(
          "day_of_week",
          {
            ascending: true,
          }
        ),

      supabase
        .from(
          "reservation_availability"
        )
        .select(
          "business_id, appointment_time, duration_minutes"
        )
        .eq(
          "business_id",
          businessId
        )
        .order(
          "appointment_time",
          {
            ascending: true,
          }
        ),
    ]);

    if (
      servicesResult.error
    ) {
      console.error(
        "SERVICES ERROR:",
        servicesResult.error
      );

      setMessage(
        "Nepodarilo sa načítať služby."
      );
    } else {
      setServices(
        (servicesResult.data ??
          []) as Service[]
      );
    }

    if (hoursResult.error) {
      console.error(
        "HOURS ERROR:",
        hoursResult.error
      );

      setMessage(
        "Nepodarilo sa načítať pracovné hodiny."
      );
    } else {
      setBusinessHours(
        (hoursResult.data ??
          []) as BusinessHour[]
      );
    }

    if (
      reservationsResult.error
    ) {
      console.error(
        "AVAILABILITY ERROR:",
        reservationsResult.error
      );

      setMessage(
        "Nepodarilo sa načítať dostupné termíny."
      );
    } else {
      setReservations(
        (reservationsResult.data ??
          []) as AvailabilityReservation[]
      );
    }
  }

  function formatDateKey(
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

  function formatDisplayDate(
    value: string
  ) {
    const [
      year,
      month,
      day,
    ] = value
      .split("-")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0
    ).toLocaleDateString(
      "sk-SK",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
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
        day,
        12,
        0,
        0
      ).getDay();

    return jsDay === 0
      ? 7
      : jsDay;
  }

  function getDayName(
    dayNumber: number
  ) {
    const names: Record<
      number,
      string
    > = {
      1: "Pondelok",
      2: "Utorok",
      3: "Streda",
      4: "Štvrtok",
      5: "Piatok",
      6: "Sobota",
      7: "Nedeľa",
      0: "Nedeľa",
    };

    return (
      names[dayNumber] ??
      "Tento deň"
    );
  }

  function timeToMinutes(
    value: string
  ) {
    const [
      hours,
      minutes,
    ] = value
      .substring(0, 5)
      .split(":")
      .map(Number);

    return (
      hours * 60 + minutes
    );
  }

  function minutesToTime(
    totalMinutes: number
  ) {
    const hours =
      Math.floor(
        totalMinutes / 60
      );

    const minutes =
      totalMinutes % 60;

    return `${String(
      hours
    ).padStart(
      2,
      "0"
    )}:${String(
      minutes
    ).padStart(
      2,
      "0"
    )}`;
  }

  function createAppointmentValue(
    date: string,
    time: string
  ) {
    return `${date} ${time}:00`;
  }

  function normalizeDateTime(
    value: string
  ) {
    return value
      .replace("T", " ")
      .substring(0, 16);
  }

  function reservationStartMinutes(
    reservation:
      AvailabilityReservation
  ) {
    const normalized =
      normalizeDateTime(
        reservation.appointment_time
      );

    const timePart =
      normalized.substring(
        11,
        16
      );

    return timeToMinutes(
      timePart
    );
  }

  function isTimeInPast(
    dateValue: string,
    timeValue: string
  ) {
    const [
      year,
      month,
      day,
    ] = dateValue
      .split("-")
      .map(Number);

    const [
      hour,
      minute,
    ] = timeValue
      .split(":")
      .map(Number);

    const appointmentDate =
      new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        0
      );

    return (
      appointmentDate.getTime() <=
      Date.now()
    );
  }

  function isValidEmail(
    value: string
  ) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    );
  }

  const selectedServiceData =
    useMemo(() => {
      return (
        services.find(
          (service) =>
            service.name ===
            selectedService
        ) ?? null
      );
    }, [
      services,
      selectedService,
    ]);

  const selectedServiceDuration =
    selectedServiceData
      ?.duration_minutes ?? 0;

  function getBusinessHourForDate(
    dateValue: string
  ) {
    if (!dateValue) {
      return null;
    }

    const dayNumber =
      getBusinessDayNumber(
        dateValue
      );

    return (
      businessHours.find(
        (item) => {
          const itemDay =
            Number(
              item.day_of_week
            );

          if (
            dayNumber === 7
          ) {
            return (
              itemDay === 7 ||
              itemDay === 0
            );
          }

          return (
            itemDay ===
            dayNumber
          );
        }
      ) ?? null
    );
  }

  const selectedBusinessHour =
    useMemo(() => {
      return getBusinessHourForDate(
        selectedDate
      );
    }, [
      selectedDate,
      businessHours,
    ]);

  const availableSlots =
    useMemo(() => {
      if (
        !selectedDate ||
        !selectedService ||
        !selectedServiceDuration ||
        !selectedBusinessHour ||
        !selectedBusinessHour.is_open ||
        !selectedBusinessHour.open_time ||
        !selectedBusinessHour.close_time
      ) {
        return [];
      }

      const startMinutes =
        timeToMinutes(
          selectedBusinessHour.open_time
        );

      const endMinutes =
        timeToMinutes(
          selectedBusinessHour.close_time
        );

      const reservationsForDay =
        reservations.filter(
          (reservation) =>
            normalizeDateTime(
              reservation.appointment_time
            ).startsWith(
              selectedDate
            )
        );

      const slots: TimeSlot[] =
        [];

      for (
        let current =
          startMinutes;
        current +
            selectedServiceDuration <=
          endMinutes;
        current +=
          SLOT_INTERVAL_MINUTES
      ) {
        const candidateStart =
          current;

        const candidateEnd =
          candidateStart +
          selectedServiceDuration;

        const overlaps =
          reservationsForDay.some(
            (reservation) => {
              const existingStart =
                reservationStartMinutes(
                  reservation
                );

              const existingDuration =
                Number(
                  reservation.duration_minutes
                ) || 60;

              const existingEnd =
                existingStart +
                existingDuration;

              return (
                candidateStart <
                  existingEnd &&
                candidateEnd >
                  existingStart
              );
            }
          );

        const time =
          minutesToTime(
            current
          );

        if (
          !overlaps &&
          !isTimeInPast(
            selectedDate,
            time
          )
        ) {
          slots.push({
            label: time,
            value:
              createAppointmentValue(
                selectedDate,
                time
              ),
          });
        }
      }

      return slots;
    }, [
      selectedDate,
      selectedService,
      selectedServiceDuration,
      selectedBusinessHour,
      reservations,
    ]);

  const today =
    useMemo(() => {
      return formatDateKey(
        new Date()
      );
    }, []);

  function handleServiceSelect(
    serviceName: string
  ) {
    setSelectedService(
      serviceName
    );

    setSelectedTime(null);
    setMessage("");
    setConfirmation(null);
  }

  function handleDateChange(
    dateValue: string
  ) {
    setSelectedTime(null);
    setMessage("");
    setConfirmation(null);

    if (!dateValue) {
      setSelectedDate("");
      return;
    }

    const businessDay =
      getBusinessHourForDate(
        dateValue
      );

    if (!businessDay) {
      setSelectedDate("");

      setMessage(
        "Pre tento deň nie sú nastavené pracovné hodiny."
      );

      return;
    }

    if (
      businessDay.is_open !==
      true
    ) {
      setSelectedDate("");

      setMessage(
        `${getDayName(
          Number(
            businessDay.day_of_week
          )
        )} je prevádzka zatvorená. Vyberte iný deň.`
      );

      return;
    }

    setSelectedDate(
      dateValue
    );
  }

  async function createReservation() {
    setMessage("");
    setConfirmation(null);

    if (!business) {
      setMessage(
        "Prevádzka nie je načítaná."
      );
      return;
    }

    if (!selectedService) {
      setMessage(
        "Vyberte službu."
      );
      return;
    }

    if (!selectedDate) {
      setMessage(
        "Vyberte dátum."
      );
      return;
    }

    if (
      !selectedBusinessHour
    ) {
      setMessage(
        "Pre tento deň nie sú nastavené pracovné hodiny."
      );
      return;
    }

    if (
      selectedBusinessHour.is_open !==
      true
    ) {
      setMessage(
        "V tento deň je prevádzka zatvorená."
      );
      return;
    }

    if (!selectedTime) {
      setMessage(
        "Vyberte čas."
      );
      return;
    }

    if (!name.trim()) {
      setMessage(
        "Zadajte meno."
      );
      return;
    }

    if (!phone.trim()) {
      setMessage(
        "Zadajte telefón."
      );
      return;
    }

    if (!email.trim()) {
      setMessage(
        "Zadajte e-mail."
      );
      return;
    }

    if (
      !isValidEmail(
        email.trim()
      )
    ) {
      setMessage(
        "Zadajte platnú e-mailovú adresu."
      );
      return;
    }

    setSaving(true);

    try {
      const dayNumber =
        getBusinessDayNumber(
          selectedDate
        );

      const possibleDayNumbers =
        dayNumber === 7
          ? [7, 0]
          : [dayNumber];

      const {
        data: latestHours,
        error:
          businessHourError,
      } = await supabase
        .from(
          "business_hours"
        )
        .select("*")
        .eq(
          "business_id",
          business.id
        )
        .in(
          "day_of_week",
          possibleDayNumbers
        );

      if (
        businessHourError
      ) {
        console.error(
          businessHourError
        );

        setMessage(
          "Nepodarilo sa skontrolovať pracovné hodiny."
        );

        return;
      }

      const latestBusinessHour =
        (
          latestHours ?? []
        )[0] as
          | BusinessHour
          | undefined;

      if (
        !latestBusinessHour
      ) {
        setMessage(
          "Pre tento deň nie sú nastavené pracovné hodiny."
        );

        return;
      }

      if (
        latestBusinessHour.is_open !==
        true
      ) {
        setSelectedDate("");
        setSelectedTime(null);

        setMessage(
          "Prevádzka je v tento deň zatvorená."
        );

        await loadBusinessData(
          business.id
        );

        return;
      }

      const {
        data:
          latestService,
        error:
          latestServiceError,
      } = await supabase
        .from("services")
        .select(
          "id, name, is_active, sort_order, duration_minutes, business_id"
        )
        .eq(
          "business_id",
          business.id
        )
        .eq(
          "name",
          selectedService
        )
        .eq(
          "is_active",
          true
        )
        .maybeSingle();

      if (
        latestServiceError
      ) {
        console.error(
          latestServiceError
        );

        setMessage(
          "Nepodarilo sa skontrolovať službu."
        );

        return;
      }

      if (!latestService) {
        setMessage(
          "Táto služba už nie je dostupná."
        );

        setSelectedService("");
        setSelectedTime(null);

        await loadBusinessData(
          business.id
        );

        return;
      }

      const currentDuration =
        Number(
          latestService.duration_minutes
        ) || 60;

      const selectedStart =
        timeToMinutes(
          selectedTime.label
        );

      const selectedEnd =
        selectedStart +
        currentDuration;

      if (
        !latestBusinessHour.close_time
      ) {
        setMessage(
          "Prevádzka nemá správne nastavený čas zatvorenia."
        );

        return;
      }

      const closingMinutes =
        timeToMinutes(
          latestBusinessHour.close_time
        );

      if (
        selectedEnd >
        closingMinutes
      ) {
        setSelectedTime(null);

        setMessage(
          "Táto služba by skončila až po zatvorení prevádzky. Vyberte iný čas."
        );

        return;
      }

      const {
        data:
          latestReservations,
        error:
          loadError,
      } = await supabase
        .from(
          "reservation_availability"
        )
        .select(
          "business_id, appointment_time, duration_minutes"
        )
        .eq(
          "business_id",
          business.id
        )
        .order(
          "appointment_time",
          {
            ascending: true,
          }
        );

      if (loadError) {
        console.error(
          loadError
        );

        setMessage(
          "Nepodarilo sa skontrolovať termín."
        );

        return;
      }

      const alreadyTaken =
        (
          latestReservations ??
          []
        ).some(
          (
            reservation:
              AvailabilityReservation
          ) => {
            if (
              !normalizeDateTime(
                reservation.appointment_time
              ).startsWith(
                selectedDate
              )
            ) {
              return false;
            }

            const existingStart =
              reservationStartMinutes(
                reservation
              );

            const existingDuration =
              Number(
                reservation.duration_minutes
              ) || 60;

            const existingEnd =
              existingStart +
              existingDuration;

            return (
              selectedStart <
                existingEnd &&
              selectedEnd >
                existingStart
            );
          }
        );

      if (alreadyTaken) {
        setReservations(
          (latestReservations ??
            []) as AvailabilityReservation[]
        );

        setSelectedTime(null);

        setMessage(
          "Tento termín už nie je dostupný. Vyberte iný čas."
        );

        return;
      }

      const confirmationData:
        Confirmation = {
          name: name.trim(),
          email: email.trim(),
          service:
            latestService.name,
          date: selectedDate,
          time:
            selectedTime.label,
          duration:
            currentDuration,
        };

      const { error } =
        await supabase
          .from(
            "reservations"
          )
          .insert({
            business_id:
              business.id,

            customer_name:
              name.trim(),

            customer_phone:
              phone.trim(),

            customer_email:
              email.trim(),

            service:
              latestService.name,

            appointment_time:
              selectedTime.value,

            duration_minutes:
              currentDuration,
          });

      if (error) {
        console.error(
          "RESERVATION ERROR:",
          error
        );

        if (
          error.code ===
          "23505"
        ) {
          setMessage(
            "Tento termín už nie je dostupný."
          );

          setSelectedTime(
            null
          );

          await loadBusinessData(
            business.id
          );

          return;
        }

        setMessage(
          "Rezerváciu sa nepodarilo uložiť: " +
            error.message
        );

        return;
      }

      // Po úspešnom uložení rezervácie
      // odošleme zákazníkovi potvrdzovací e-mail.
      try {
        const emailResponse =
          await fetch(
            "/api/send-confirmation",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                email:
                  email.trim(),

                customerName:
                  name.trim(),

                businessName:
                  business.name,

                service:
                  latestService.name,

                date:
                  formatDisplayDate(
                    selectedDate
                  ),

                time:
                  selectedTime.label,

                duration:
                  currentDuration,
              }),
            }
          );

        if (!emailResponse.ok) {
          const emailError =
            await emailResponse
              .json()
              .catch(() => null);

          console.error(
            "EMAIL SEND ERROR:",
            emailError
          );
        }
      } catch (emailError) {
        console.error(
          "EMAIL SEND ERROR:",
          emailError
        );
      }

      setConfirmation(
        confirmationData
      );

      setName("");
      setPhone("");
      setEmail("");
      setSelectedService("");
      setSelectedDate("");
      setSelectedTime(null);

      await loadBusinessData(
        business.id
      );

      setMessage("");
    } catch (error) {
      console.error(
        "BOOKING ERROR:",
        error
      );

      setMessage(
        "Pri vytváraní rezervácie nastala chyba."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-lg font-semibold text-gray-700">
            Načítavam prevádzku...
          </p>
        </div>
      </main>
    );
  }

  if (
    businessNotFound ||
    !business
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">
            🔎
          </div>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Prevádzka neexistuje
          </h1>

          <p className="mt-3 text-gray-500">
            Skontrolujte zákaznícky odkaz.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            {business.name}
          </h1>

          <p className="mt-2 text-gray-500">
            Online rezervácia termínu
          </p>
        </div>

        {confirmation && (
          <section className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-6">
            <h2 className="text-2xl font-bold text-green-800">
              ✅ Rezervácia bola vytvorená
            </h2>

            <div className="mt-4 space-y-2 text-gray-800">
              <p>
                <strong>
                  Meno:
                </strong>{" "}
                {confirmation.name}
              </p>

              <p>
                <strong>
                  E-mail:
                </strong>{" "}
                {confirmation.email}
              </p>

              <p>
                <strong>
                  Služba:
                </strong>{" "}
                {confirmation.service}
              </p>

              <p>
                <strong>
                  Dĺžka:
                </strong>{" "}
                {confirmation.duration} min
              </p>

              <p>
                <strong>
                  Dátum:
                </strong>{" "}
                {formatDisplayDate(
                  confirmation.date
                )}
              </p>

              <p>
                <strong>
                  Čas:
                </strong>{" "}
                {confirmation.time}
              </p>
            </div>
          </section>
        )}

        {message && (
          <div className="mb-6 rounded-xl bg-yellow-50 p-4 font-semibold text-yellow-900">
            {message}
          </div>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            1. Vyberte službu
          </h2>

          {services.length ===
          0 ? (
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-gray-500">
              Táto prevádzka momentálne nemá dostupné služby.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {services.map(
                (service) => {
                  const selected =
                    selectedService ===
                    service.name;

                  return (
                    <button
                      key={
                        service.id
                      }
                      type="button"
                      onClick={() =>
                        handleServiceSelect(
                          service.name
                        )
                      }
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-bold">
                        {
                          service.name
                        }
                      </div>

                      <div
                        className={`mt-1 text-sm ${
                          selected
                            ? "text-gray-200"
                            : "text-gray-500"
                        }`}
                      >
                        {
                          service.duration_minutes
                        }{" "}
                        min
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900">
              2. Vyberte dátum
            </h2>

            <input
              type="date"
              min={today}
              value={
                selectedDate
              }
              disabled={
                !selectedService
              }
              onChange={(e) =>
                handleDateChange(
                  e.target.value
                )
              }
              className="mt-4 w-full rounded-xl border border-gray-200 bg-white p-4 text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            {!selectedService && (
              <p className="mt-2 text-sm text-gray-500">
                Najskôr vyberte službu.
              </p>
            )}
          </div>

          {selectedDate &&
            selectedBusinessHour && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900">
                  3. Vyberte čas
                </h2>

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

                {availableSlots.length ===
                0 ? (
                  <div className="mt-4 rounded-xl bg-gray-50 p-4 text-gray-500">
                    Na tento deň už nie sú voľné termíny pre vybranú službu.
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {availableSlots.map(
                      (time) => (
                        <button
                          key={
                            time.value
                          }
                          type="button"
                          onClick={() => {
                            setSelectedTime(
                              time
                            );

                            setMessage(
                              ""
                            );

                            setConfirmation(
                              null
                            );
                          }}
                          className={`rounded-xl p-4 text-center font-semibold transition ${
                            selectedTime
                              ?.value ===
                            time.value
                              ? "bg-black text-white"
                              : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                          }`}
                        >
                          {
                            time.label
                          }
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900">
              4. Vaše údaje
            </h2>

            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Meno"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                autoComplete="name"
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
              />

              <input
                type="tel"
                placeholder="Telefón"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value
                  )
                }
                autoComplete="tel"
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
              />

              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={
              createReservation
            }
            disabled={
              saving ||
              !selectedService ||
              !selectedDate ||
              !selectedTime
            }
            className="mt-6 w-full rounded-xl bg-black p-4 font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {saving
              ? "Ukladám..."
              : "Rezervovať termín"}
          </button>
        </section>
      </div>
    </main>
  );
}