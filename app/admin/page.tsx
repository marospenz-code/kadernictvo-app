"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Reservation = {
  id: number;
  customer_name: string;
  customer_phone: string;
  service: string;
  appointment_time: string;
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

type Service = {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
  duration_minutes: number;
  business_id: number;
};

type Business = {
  id: number;
  name: string;
  slug: string;
};

const SLOT_INTERVAL_MINUTES = 15;

export default function AdminPage() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState<number | null>(null);
  const [businessSlug, setBusinessSlug] = useState("");
  const [businessName, setBusinessName] = useState("");

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState(60);
  const [savingServiceId, setSavingServiceId] = useState<number | null>(null);
  const [addingService, setAddingService] = useState(false);

  const [savingBusinessName, setSavingBusinessName] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState("");

  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualService, setManualService] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [addingReservation, setAddingReservation] = useState(false);

  useEffect(() => {
    checkLogin();
  }, []);

  function getDayName(dayNumber: number) {
    const names: Record<number, string> = {
      1: "Pondelok",
      2: "Utorok",
      3: "Streda",
      4: "Štvrtok",
      5: "Piatok",
      6: "Sobota",
      7: "Nedeľa",
      0: "Nedeľa",
    };

    return names[dayNumber] ?? `Deň ${dayNumber}`;
  }

  async function checkLogin() {
    setCheckingAuth(true);

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("AUTH ERROR:", error);
    }

    if (!session) {
      router.replace("/admin/login");
      return;
    }

    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, slug")
      .eq("owner_id", session.user.id)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (businessError) {
      console.error("BUSINESS ERROR:", businessError);

      setMessage(
        "Nepodarilo sa načítať prevádzku: " + businessError.message
      );

      setCheckingAuth(false);
      setLoading(false);
      return;
    }

    if (!businessData) {
      setMessage(
        "K tomuto účtu zatiaľ nie je priradená žiadna prevádzka."
      );

      setCheckingAuth(false);
      setLoading(false);
      return;
    }

    const business = businessData as Business;

    setBusinessId(business.id);
    setBusinessName(business.name);
    setBusinessSlug(business.slug);

    setCheckingAuth(false);

    await loadData(business.id);
  }

  async function loadData(forBusinessId?: number) {
    const targetBusinessId = forBusinessId ?? businessId;

    if (!targetBusinessId) {
      return;
    }

    setLoading(true);

    const [reservationsResult, hoursResult, servicesResult] =
      await Promise.all([
        supabase
          .from("reservations")
          .select(
            "id, customer_name, customer_phone, service, appointment_time, duration_minutes, business_id"
          )
          .eq("business_id", targetBusinessId)
          .order("appointment_time", {
            ascending: true,
          }),

        supabase
          .from("business_hours")
          .select("*")
          .eq("business_id", targetBusinessId)
          .order("day_of_week", {
            ascending: true,
          }),

        supabase
          .from("services")
          .select(
            "id, name, is_active, sort_order, duration_minutes, business_id"
          )
          .eq("business_id", targetBusinessId)
          .order("sort_order", {
            ascending: true,
          })
          .order("id", {
            ascending: true,
          }),
      ]);

    if (reservationsResult.error) {
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
        (reservationsResult.data ?? []) as Reservation[]
      );
    }

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
        (hoursResult.data ?? []) as BusinessHour[]
      );
    }

    if (servicesResult.error) {
      console.error(
        "SERVICES ERROR:",
        servicesResult.error
      );

      setMessage(
        "Chyba pri načítaní služieb: " +
          servicesResult.error.message
      );
    } else {
      const loadedServices =
        (servicesResult.data ?? []) as Service[];

      setServices(loadedServices);

      setManualService((current) => {
        const activeServices = loadedServices.filter(
          (service) => service.is_active
        );

        const currentStillExists =
          activeServices.some(
            (service) =>
              service.name === current
          );

        if (current && currentStillExists) {
          return current;
        }

        return activeServices[0]?.name ?? "";
      });
    }

    setLoading(false);
  }

  async function saveBusinessName() {
    if (!businessId) {
      setMessage("Prevádzka nie je načítaná.");
      return;
    }

    const trimmedName = businessName.trim();

    if (!trimmedName) {
      setMessage("Zadajte názov prevádzky.");
      return;
    }

    setSavingBusinessName(true);
    setMessage("");

    const { error } = await supabase
      .from("businesses")
      .update({
        name: trimmedName,
      })
      .eq("id", businessId);

    if (error) {
      setMessage(
        "Názov prevádzky sa nepodarilo uložiť: " +
          error.message
      );

      setSavingBusinessName(false);
      return;
    }

    setBusinessName(trimmedName);

    setMessage(
      "✅ Názov prevádzky bol uložený."
    );

    setSavingBusinessName(false);
  }

  async function logout() {
    await supabase.auth.signOut();

    router.replace("/admin/login");
    router.refresh();
  }

  async function deleteReservation(id: number) {
    if (!businessId) {
      return;
    }

    const confirmed = window.confirm(
      "Naozaj chcete zrušiť túto rezerváciu?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      setMessage(
        "Rezerváciu sa nepodarilo zrušiť: " +
          error.message
      );

      return;
    }

    await loadData();

    setMessage("Rezervácia bola zrušená.");
  }

  function updateBusinessHour(
    index: number,
    field: keyof BusinessHour,
    value: string | boolean
  ) {
    setBusinessHours((current) => {
      const copy = [...current];

      copy[index] = {
        ...copy[index],
        [field]: value,
      };

      return copy;
    });
  }

  async function saveBusinessHour(
    item: BusinessHour
  ) {
    if (!businessId) {
      return;
    }

    const { error } = await supabase
      .from("business_hours")
      .update({
        is_open: item.is_open,

        open_time: item.is_open
          ? item.open_time
          : null,

        close_time: item.is_open
          ? item.close_time
          : null,
      })
      .eq("id", item.id)
      .eq("business_id", businessId);

    if (error) {
      setMessage(
        "Pracovné hodiny sa nepodarilo uložiť: " +
          error.message
      );

      return;
    }

    await loadData();

    setMessage(
      `${getDayName(
        Number(item.day_of_week)
      )} bol uložený.`
    );
  }

  function updateServiceName(
    index: number,
    value: string
  ) {
    setServices((current) => {
      const copy = [...current];

      copy[index] = {
        ...copy[index],
        name: value,
      };

      return copy;
    });
  }

  function updateServiceDuration(
    index: number,
    value: number
  ) {
    setServices((current) => {
      const copy = [...current];

      copy[index] = {
        ...copy[index],
        duration_minutes: value,
      };

      return copy;
    });
  }

  function durationIsValid(duration: number) {
    return (
      Number.isFinite(duration) &&
      duration >= 15 &&
      duration % 15 === 0
    );
  }

  async function addService() {
    if (!businessId) {
      setMessage("Prevádzka nie je načítaná.");
      return;
    }

    const trimmedName = newServiceName.trim();

    if (!trimmedName) {
      setMessage(
        "Zadajte názov novej služby."
      );

      return;
    }

    if (!durationIsValid(newServiceDuration)) {
      setMessage(
        "Dĺžka služby musí byť aspoň 15 minút a musí byť násobkom 15 minút."
      );

      return;
    }

    setAddingService(true);
    setMessage("");

    const nextSortOrder =
      services.length === 0
        ? 1
        : Math.max(
            ...services.map(
              (service) =>
                Number(
                  service.sort_order
                ) || 0
            )
          ) + 1;

    const { error } = await supabase
      .from("services")
      .insert({
        business_id: businessId,
        name: trimmedName,
        is_active: true,
        sort_order: nextSortOrder,
        duration_minutes:
          newServiceDuration,
      });

    if (error) {
      setMessage(
        "Službu sa nepodarilo pridať: " +
          error.message
      );

      setAddingService(false);
      return;
    }

    setNewServiceName("");
    setNewServiceDuration(60);

    await loadData();

    setMessage(
      "✅ Služba bola pridaná."
    );

    setAddingService(false);
  }

  async function saveService(
    service: Service
  ) {
    if (!businessId) {
      return;
    }

    const trimmedName = service.name.trim();

    if (!trimmedName) {
      setMessage(
        "Názov služby nemôže byť prázdny."
      );

      return;
    }

    if (
      !durationIsValid(
        service.duration_minutes
      )
    ) {
      setMessage(
        "Dĺžka služby musí byť aspoň 15 minút a musí byť násobkom 15 minút."
      );

      return;
    }

    setSavingServiceId(service.id);
    setMessage("");

    const { error } = await supabase
      .from("services")
      .update({
        name: trimmedName,
        sort_order:
          service.sort_order,
        duration_minutes:
          service.duration_minutes,
      })
      .eq("id", service.id)
      .eq("business_id", businessId);

    if (error) {
      setMessage(
        "Službu sa nepodarilo uložiť: " +
          error.message
      );

      setSavingServiceId(null);
      return;
    }

    await loadData();

    setMessage(
      "✅ Služba bola uložená."
    );

    setSavingServiceId(null);
  }

  async function toggleService(
    service: Service
  ) {
    if (!businessId) {
      return;
    }

    setSavingServiceId(service.id);
    setMessage("");

    const newValue =
      !service.is_active;

    const { error } = await supabase
      .from("services")
      .update({
        is_active: newValue,
      })
      .eq("id", service.id)
      .eq("business_id", businessId);

    if (error) {
      setMessage(
        "Stav služby sa nepodarilo zmeniť: " +
          error.message
      );

      setSavingServiceId(null);
      return;
    }

    await loadData();

    setMessage(
      newValue
        ? "✅ Služba bola zapnutá."
        : "Služba bola vypnutá."
    );

    setSavingServiceId(null);
  }

  async function deleteService(
    service: Service
  ) {
    if (!businessId) {
      return;
    }

    const confirmed = window.confirm(
      `Naozaj chcete vymazať službu "${service.name}"? Staré rezervácie zostanú zachované.`
    );

    if (!confirmed) {
      return;
    }

    setSavingServiceId(service.id);
    setMessage("");

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", service.id)
      .eq("business_id", businessId);

    if (error) {
      setMessage(
        "Službu sa nepodarilo vymazať: " +
          error.message
      );

      setSavingServiceId(null);
      return;
    }

    await loadData();

    setMessage(
      "Služba bola vymazaná."
    );

    setSavingServiceId(null);
  }

  function formatDate(date: Date) {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
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
        dateStyle: "medium",
        timeStyle: "short",
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

    const [year, month, day] =
      dateValue
        .split("-")
        .map(Number);

    const jsDay = new Date(
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
    const [hours, minutes] = time
      .slice(0, 5)
      .split(":")
      .map(Number);

    return hours * 60 + minutes;
  }

  function minutesToTime(
    minutes: number
  ) {
    const hours = Math.floor(
      minutes / 60
    );

    const mins = minutes % 60;

    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(mins).padStart(
      2,
      "0"
    )}`;
  }

  function reservationStartMinutes(
    reservation: Reservation
  ) {
    const normalized =
      reservation.appointment_time.replace(
        "T",
        " "
      );

    const timePart =
      normalized.substring(11, 16);

    return timeToMinutes(timePart);
  }

  const selectedManualService =
    useMemo(() => {
      return (
        services.find(
          (service) =>
            service.name ===
            manualService
        ) ?? null
      );
    }, [
      services,
      manualService,
    ]);

  const manualServiceDuration =
    selectedManualService
      ?.duration_minutes ?? 60;

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
          (item) => {
            const itemDay =
              Number(
                item.day_of_week
              );

            if (dayNumber === 7) {
              return (
                itemDay === 7 ||
                itemDay === 0
              );
            }

            return itemDay === dayNumber;
          }
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
        !manualService ||
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

      const reservationsForDay =
        reservations.filter(
          (reservation) =>
            reservation.appointment_time
              .replace("T", " ")
              .slice(0, 10) ===
            manualDate
        );

      const result: string[] = [];

      for (
        let minutes = start;
        minutes +
            manualServiceDuration <=
        end;
        minutes +=
          SLOT_INTERVAL_MINUTES
      ) {
        const candidateStart =
          minutes;

        const candidateEnd =
          candidateStart +
          manualServiceDuration;

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

        if (!overlaps) {
          result.push(
            minutesToTime(minutes)
          );
        }
      }

      return result;
    }, [
      manualDate,
      manualService,
      manualBusinessHour,
      manualServiceDuration,
      reservations,
    ]);

  async function addManualReservation() {
    if (addingReservation) {
      return;
    }

    if (!businessId) {
      setMessage(
        "Prevádzka nie je načítaná."
      );
      return;
    }

    setMessage("");

    if (!manualName.trim()) {
      setMessage(
        "Zadajte meno zákazníka."
      );
      return;
    }

    if (!manualPhone.trim()) {
      setMessage(
        "Zadajte telefón zákazníka."
      );
      return;
    }

    if (!manualService) {
      setMessage("Vyberte službu.");
      return;
    }

    if (!selectedManualService) {
      setMessage(
        "Vybraná služba neexistuje."
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
      !manualBusinessHour.is_open ||
      !manualBusinessHour.open_time ||
      !manualBusinessHour.close_time
    ) {
      setMessage(
        "V tento deň je prevádzka zatvorená."
      );
      return;
    }

    if (!manualTime) {
      setMessage(
        "Vyberte voľný čas."
      );
      return;
    }

    const selectedStart =
      timeToMinutes(
        manualTime
      );

    const selectedEnd =
      selectedStart +
      manualServiceDuration;

    const closingTime =
      timeToMinutes(
        manualBusinessHour.close_time
      );

    if (selectedEnd > closingTime) {
      setMessage(
        "Táto služba by skončila až po zatvorení prevádzky."
      );
      return;
    }

    setAddingReservation(true);

    try {
      const {
        data: latestReservations,
        error: latestError,
      } = await supabase
        .from("reservations")
        .select(
          "id, customer_name, customer_phone, service, appointment_time, duration_minutes, business_id"
        )
        .eq(
          "business_id",
          businessId
        );

      if (latestError) {
        setMessage(
          "Nepodarilo sa overiť voľný termín: " +
            latestError.message
        );

        return;
      }

      const alreadyBooked = (
        latestReservations ?? []
      ).some(
        (
          reservation: Reservation
        ) => {
          if (
            reservation.appointment_time
              .replace("T", " ")
              .slice(0, 10) !==
            manualDate
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
        .from("reservations")
        .insert({
          business_id:
            businessId,

          customer_name:
            manualName.trim(),

          customer_phone:
            manualPhone.trim(),

          service:
            manualService,

          appointment_time:
            appointmentTime,

          duration_minutes:
            manualServiceDuration,
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

      setManualName("");
      setManualPhone("");
      setManualTime("");

      setSelectedDate(
        manualDate
      );

      await loadData();

      setMessage(
        "✅ Rezervácia bola úspešne pridaná."
      );
    } catch (error) {
      console.error(
        "MANUAL RESERVATION ERROR:",
        error
      );

      setMessage(
        "Nastala chyba pri vytváraní rezervácie."
      );
    } finally {
      setAddingReservation(false);
    }
  }

  function previousMonth() {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      )
    );
  }

  function nextMonth() {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      )
    );
  }

  function goToday() {
    const today = new Date();

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
            reservation.appointment_time
              .replace("T", " ")
              .slice(0, 10) ===
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

      if (startDay === 0) {
        startDay = 7;
      }

      const days:
        Array<Date | null> = [];

      for (
        let i = 1;
        i < startDay;
        i++
      ) {
        days.push(null);
      }

      for (
        let day = 1;
        day <= lastDay.getDate();
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

      return reservations
        .filter(
          (reservation) =>
            reservation.appointment_time
              .replace("T", " ")
              .slice(0, 10) ===
            selectedDate
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
      selectedDate,
    ]);

  function countReservationsForDate(
    date: Date
  ) {
    const dateString =
      formatDate(date);

    return reservations.filter(
      (reservation) =>
        reservation.appointment_time
          .replace("T", " ")
          .slice(0, 10) ===
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

  if (!businessId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Prevádzka nebola nájdená
          </h1>

          <p className="mt-4 text-gray-600">
            K tomuto účtu zatiaľ nie je priradená prevádzka.
          </p>

          {message && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
              {message}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/register"
                )
              }
              className="rounded-xl bg-black px-6 py-3 font-bold text-white"
            >
              Registrácia prevádzky
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border px-6 py-3 font-bold"
            >
              Odhlásiť
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              ⚙️ Administrácia
            </h1>

            <p className="mt-2 text-gray-500">
              {businessName} · Rezervácie,
              služby a pracovné hodiny
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                loadData()
              }
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
          <h2 className="text-2xl font-bold text-gray-900">
            🔗 Zákaznícky link
          </h2>

          <p className="mt-2 text-gray-500">
            Tento link môžete poslať zákazníkom na vytvorenie rezervácie.
          </p>

          <a
            href={`https://kadernictvo-app.vercel.app/b/${businessSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block break-all rounded-xl bg-gray-100 p-4 font-mono font-semibold text-blue-700 underline"
          >
            https://kadernictvo-app.vercel.app/b/{businessSlug}
          </a>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            🏢 Nastavenie prevádzky
          </h2>

          <p className="mt-2 text-gray-500">
            Názov je teraz uložený priamo pri vašej prevádzke.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={businessName}
              onChange={(e) =>
                setBusinessName(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  saveBusinessName();
                }
              }}
              placeholder="Názov prevádzky"
              className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black"
            />

            <button
              type="button"
              onClick={
                saveBusinessName
              }
              disabled={
                savingBusinessName
              }
              className="rounded-xl bg-black px-6 py-3 font-bold text-white disabled:bg-gray-400"
            >
              {savingBusinessName
                ? "Ukladám..."
                : "Uložiť názov"}
            </button>
          </div>
        </section>

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

          {todayReservations.length === 0 ? (
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
                          }{" "}
                          ·{" "}
                          {reservation.duration_minutes ||
                            60}{" "}
                          min
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
                value={manualName}
                onChange={(e) =>
                  setManualName(
                    e.target.value
                  )
                }
                placeholder="Ján Novák"
                className="w-full rounded-xl border bg-white p-3 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Telefón
              </label>

              <input
                type="tel"
                value={manualPhone}
                onChange={(e) =>
                  setManualPhone(
                    e.target.value
                  )
                }
                placeholder="+421..."
                className="w-full rounded-xl border bg-white p-3 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Služba
              </label>

              <select
                value={manualService}
                onChange={(e) => {
                  setManualService(
                    e.target.value
                  );

                  setManualTime("");
                }}
                className="w-full rounded-xl border bg-white p-3 text-gray-900"
              >
                <option value="">
                  Vyberte službu
                </option>

                {services
                  .filter(
                    (service) =>
                      service.is_active
                  )
                  .map(
                    (service) => (
                      <option
                        key={
                          service.id
                        }
                        value={
                          service.name
                        }
                      >
                        {service.name} —{" "}
                        {
                          service.duration_minutes
                        }{" "}
                        min
                      </option>
                    )
                  )}
              </select>

              {selectedManualService && (
                <p className="mt-2 text-sm text-gray-500">
                  Dĺžka služby:{" "}
                  {
                    manualServiceDuration
                  }{" "}
                  min
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Dátum
              </label>

              <input
                type="date"
                value={manualDate}
                onChange={(e) => {
                  setManualDate(
                    e.target.value
                  );

                  setManualTime("");
                }}
                className="w-full rounded-xl border bg-white p-3 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Čas
              </label>

              <select
                value={manualTime}
                onChange={(e) =>
                  setManualTime(
                    e.target.value
                  )
                }
                disabled={
                  !manualDate ||
                  !manualService ||
                  !manualBusinessHour
                    ?.is_open
                }
                className="w-full rounded-xl border bg-white p-3 text-gray-900 disabled:bg-gray-100"
              >
                <option value="">
                  Vyberte čas
                </option>

                {manualAvailableTimes.map(
                  (time) => (
                    <option
                      key={time}
                      value={time}
                    >
                      {time}
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
                V tento deň je prevádzka zatvorená.
              </div>
            )}

          {manualDate &&
            manualBusinessHour
              ?.is_open &&
            manualService &&
            manualAvailableTimes.length ===
              0 && (
              <div className="mt-4 rounded-xl bg-yellow-50 p-4 font-semibold">
                Na tento deň už nie sú voľné termíny pre túto službu.
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

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            ⚙️ Správa služieb
          </h2>

          <p className="mt-2 text-gray-500">
            Pridávajte, premenovávajte, nastavujte dĺžku, zapínajte alebo vypínajte služby.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <input
              type="text"
              value={newServiceName}
              onChange={(e) =>
                setNewServiceName(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  addService();
                }
              }}
              placeholder="Názov novej služby"
              className="min-w-0 rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black"
            />

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-600">
                Dĺžka (min)
              </label>

              <input
                type="number"
                min="15"
                step="15"
                value={
                  newServiceDuration
                }
                onChange={(e) =>
                  setNewServiceDuration(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black"
              />
            </div>

            <button
              type="button"
              onClick={addService}
              disabled={
                addingService
              }
              className="self-end rounded-xl bg-black px-6 py-3 font-bold text-white disabled:bg-gray-400"
            >
              {addingService
                ? "Pridávam..."
                : "Pridať službu"}
            </button>
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Dĺžku nastavuj po 15 minútach, napríklad 30, 45, 60, 90 alebo 120 minút.
          </p>

          {loading ? (
            <p className="mt-6">
              Načítavam služby...
            </p>
          ) : services.length === 0 ? (
            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-gray-500">
              Zatiaľ nie sú vytvorené žiadne služby.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {services.map(
                (
                  service,
                  index
                ) => (
                  <div
                    key={
                      service.id
                    }
                    className="grid gap-3 rounded-xl border border-gray-200 p-4 lg:grid-cols-[1fr_180px_auto_auto_auto] lg:items-center"
                  >
                    <div>
                      <input
                        type="text"
                        value={
                          service.name
                        }
                        onChange={(e) =>
                          updateServiceName(
                            index,
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white p-3 font-semibold text-gray-900 outline-none focus:border-black"
                      />

                      <div className="mt-2 text-sm">
                        {service.is_active ? (
                          <span className="font-semibold text-green-700">
                            🟢 Aktívna
                          </span>
                        ) : (
                          <span className="font-semibold text-gray-500">
                            ⚪ Vypnutá
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">
                        Dĺžka (min)
                      </label>

                      <input
                        type="number"
                        min="15"
                        step="15"
                        value={
                          service.duration_minutes
                        }
                        onChange={(e) =>
                          updateServiceDuration(
                            index,
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        saveService(
                          service
                        )
                      }
                      disabled={
                        savingServiceId ===
                        service.id
                      }
                      className="rounded-lg bg-black px-4 py-3 font-semibold text-white disabled:bg-gray-400"
                    >
                      Uložiť
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleService(
                          service
                        )
                      }
                      disabled={
                        savingServiceId ===
                        service.id
                      }
                      className={`rounded-lg px-4 py-3 font-semibold ${
                        service.is_active
                          ? "bg-yellow-100 text-yellow-900"
                          : "bg-green-100 text-green-900"
                      } disabled:opacity-50`}
                    >
                      {service.is_active
                        ? "Vypnúť"
                        : "Zapnúť"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteService(
                          service
                        )
                      }
                      disabled={
                        savingServiceId ===
                        service.id
                      }
                      className="rounded-lg bg-red-600 px-4 py-3 font-semibold text-white disabled:bg-red-300"
                    >
                      Vymazať
                    </button>
                  </div>
                )
              )}
            </div>
          )}
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
                {monthName}
              </h2>

              <button
                type="button"
                onClick={nextMonth}
                className="rounded-lg border px-3 py-2"
              >
                →
              </button>
            </div>

            <button
              type="button"
              onClick={goToday}
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
                  if (!date) {
                    return (
                      <div
                        key={index}
                        className="h-20"
                      />
                    );
                  }

                  const dateString =
                    formatDate(date);

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

                      {count > 0 && (
                        <div className="mt-1 text-xs">
                          {count} rez.
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
                (reservation) => (
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
                      }{" "}
                      ·{" "}
                      {reservation.duration_minutes ||
                        60}{" "}
                      min
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
          ) : businessHours.length ===
            0 ? (
            <div className="mt-6 rounded-xl bg-yellow-50 p-4">
              Pre túto prevádzku zatiaľ nie sú nastavené pracovné hodiny.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {businessHours.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={
                      item.id
                    }
                    className="grid gap-4 rounded-xl border p-4 md:grid-cols-5 md:items-center"
                  >
                    <div className="font-bold">
                      {getDayName(
                        Number(
                          item.day_of_week
                        )
                      )}
                    </div>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          item.is_open
                        }
                        onChange={(e) =>
                          updateBusinessHour(
                            index,
                            "is_open",
                            e.target
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
                      onChange={(e) =>
                        updateBusinessHour(
                          index,
                          "open_time",
                          e.target.value
                        )
                      }
                      className="rounded-lg border bg-white p-3 text-gray-900 disabled:bg-gray-100"
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
                      onChange={(e) =>
                        updateBusinessHour(
                          index,
                          "close_time",
                          e.target.value
                        )
                      }
                      className="rounded-lg border bg-white p-3 text-gray-900 disabled:bg-gray-100"
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