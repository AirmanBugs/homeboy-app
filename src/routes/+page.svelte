<script lang="ts">
  import { onMount } from "svelte";
  import Settings from "$lib/components/Settings.svelte";
  import Weather from "$lib/components/Weather.svelte";
  import Calendar from "$lib/components/Calendar.svelte";
  import Commute from "$lib/components/Commute.svelte";
  import AstroEvent from "$lib/components/AstroEvent.svelte";
  import WeatherIcon from "$lib/components/WeatherIcon.svelte";
  import { language } from "$lib/stores/language";
  import { t, translations } from "$lib/i18n/translations";
  import type {
    AstroData,
    AstroEvent as AstroEventType,
  } from "$lib/types/astro";

  let currentTime = $state(new Date());
  let isSettingsOpen = $state(false);
  let astroData = $state<AstroData | null>(null);
  let tomorrowAstroData = $state<AstroData | null>(null);
  let yesterdayAstroData = $state<AstroData | null>(null);

  const currentLang = $derived($language);

  // Default to Oslo for astro data
  const DEFAULT_LAT = 59.9139;
  const DEFAULT_LON = 10.7522;

  const fetchAstroData = async () => {
    try {
      // Fetch yesterday's data for day length comparison
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split("T")[0];

      const yesterdayResponse = await fetch(
        `/api/astro?lat=${DEFAULT_LAT}&lon=${DEFAULT_LON}&date=${yesterdayDate}`
      );
      if (yesterdayResponse.ok) {
        yesterdayAstroData = await yesterdayResponse.json();
      }

      // Fetch today's data
      const response = await fetch(
        `/api/astro?lat=${DEFAULT_LAT}&lon=${DEFAULT_LON}`
      );
      if (response.ok) {
        astroData = await response.json();
      }

      // Fetch tomorrow's data for future events
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split("T")[0];

      const tomorrowResponse = await fetch(
        `/api/astro?lat=${DEFAULT_LAT}&lon=${DEFAULT_LON}&date=${tomorrowDate}`
      );
      if (tomorrowResponse.ok) {
        tomorrowAstroData = await tomorrowResponse.json();
      }
    } catch (err) {
      console.error("Failed to fetch astro data:", err);
    }
  };

  // Get all astro events sorted by time, separated by sun and moon
  const astroEvents = $derived.by(
    (): {
      mostRecentSun: AstroEventType | null;
      mostRecentMoon: AstroEventType | null;
      nextUpcomingSun: AstroEventType | null;
      nextUpcomingMoon: AstroEventType | null;
    } => {
      if (!astroData)
        return {
          mostRecentSun: null,
          mostRecentMoon: null,
          nextUpcomingSun: null,
          nextUpcomingMoon: null,
        };

      const now = currentTime;
      const sunEvents: AstroEventType[] = [];
      const moonEvents: AstroEventType[] = [];

      // Add today's events
      if (astroData.sunrise) {
        sunEvents.push({
          type: "sunrise",
          time: new Date(astroData.sunrise.time),
          azimuth: astroData.sunrise.azimuth,
          isPast: new Date(astroData.sunrise.time) < now,
        });
      }
      if (astroData.sunset) {
        sunEvents.push({
          type: "sunset",
          time: new Date(astroData.sunset.time),
          azimuth: astroData.sunset.azimuth,
          isPast: new Date(astroData.sunset.time) < now,
        });
      }
      if (astroData.moonrise) {
        moonEvents.push({
          type: "moonrise",
          time: new Date(astroData.moonrise.time),
          azimuth: astroData.moonrise.azimuth,
          isPast: new Date(astroData.moonrise.time) < now,
        });
      }
      if (astroData.moonset) {
        moonEvents.push({
          type: "moonset",
          time: new Date(astroData.moonset.time),
          azimuth: astroData.moonset.azimuth,
          isPast: new Date(astroData.moonset.time) < now,
        });
      }

      // Add tomorrow's events (all will be future)
      if (tomorrowAstroData) {
        if (tomorrowAstroData.sunrise) {
          sunEvents.push({
            type: "sunrise",
            time: new Date(tomorrowAstroData.sunrise.time),
            azimuth: tomorrowAstroData.sunrise.azimuth,
            isPast: false,
          });
        }
        if (tomorrowAstroData.sunset) {
          sunEvents.push({
            type: "sunset",
            time: new Date(tomorrowAstroData.sunset.time),
            azimuth: tomorrowAstroData.sunset.azimuth,
            isPast: false,
          });
        }
        if (tomorrowAstroData.moonrise) {
          moonEvents.push({
            type: "moonrise",
            time: new Date(tomorrowAstroData.moonrise.time),
            azimuth: tomorrowAstroData.moonrise.azimuth,
            isPast: false,
          });
        }
        if (tomorrowAstroData.moonset) {
          moonEvents.push({
            type: "moonset",
            time: new Date(tomorrowAstroData.moonset.time),
            azimuth: tomorrowAstroData.moonset.azimuth,
            isPast: false,
          });
        }
      }

      // Get most recent sun event
      const pastSunEvents = sunEvents
        .filter((e) => e.isPast)
        .sort((a, b) => b.time.getTime() - a.time.getTime());
      const mostRecentSun = pastSunEvents[0] || null;

      // Get next upcoming sun event
      const futureSunEvents = sunEvents
        .filter((e) => !e.isPast)
        .sort((a, b) => a.time.getTime() - b.time.getTime());
      const nextUpcomingSun = futureSunEvents[0] || null;

      // Get most recent moon event
      const pastMoonEvents = moonEvents
        .filter((e) => e.isPast)
        .sort((a, b) => b.time.getTime() - a.time.getTime());
      const mostRecentMoon = pastMoonEvents[0] || null;

      // Get next upcoming moon event
      const futureMoonEvents = moonEvents
        .filter((e) => !e.isPast)
        .sort((a, b) => a.time.getTime() - b.time.getTime());
      const nextUpcomingMoon = futureMoonEvents[0] || null;

      return {
        mostRecentSun,
        mostRecentMoon,
        nextUpcomingSun,
        nextUpcomingMoon,
      };
    }
  );

  // Convert azimuth degrees to compass direction
  const getCompassDirection = (azimuth: number): string => {
    const directions: Array<keyof typeof translations.en> = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(azimuth / 45) % 8;
    return t(currentLang, directions[index]);
  };

  // Format time difference (ago for past, until for future)
  const getTimeDifference = (event: AstroEventType | null): string => {
    if (!event) return "";

    const now = currentTime;
    const diffMs = event.isPast
      ? now.getTime() - event.time.getTime()
      : event.time.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    const timeStr =
      diffHours > 0
        ? `${diffHours}${t(currentLang, "hour")} ${diffMins % 60}${t(currentLang, "minute")}`
        : `${diffMins}${t(currentLang, "minute")}`;

    return event.isPast
      ? `${timeStr} ${t(currentLang, "ago")}`
      : currentLang === "en"
        ? `in ${timeStr}`
        : `om ${timeStr}`;
  };

  // Calculate day length and difference from yesterday
  const dayLengthInfo = $derived.by(
    (): {
      length: string;
      difference: string;
      diffValue: number;
    } | null => {
      if (!astroData?.sunrise || !astroData?.sunset) return null;

      const sunrise = new Date(astroData.sunrise.time);
      const sunset = new Date(astroData.sunset.time);
      const lengthMs = sunset.getTime() - sunrise.getTime();
      const lengthMins = Math.floor(lengthMs / 60000);
      const hours = Math.floor(lengthMins / 60);
      const mins = lengthMins % 60;

      // Calculate difference from yesterday
      let difference = "";
      let diffValue = 0;
      if (yesterdayAstroData?.sunrise && yesterdayAstroData?.sunset) {
        const yesterdaySunrise = new Date(yesterdayAstroData.sunrise.time);
        const yesterdaySunset = new Date(yesterdayAstroData.sunset.time);
        const yesterdayLengthMs =
          yesterdaySunset.getTime() - yesterdaySunrise.getTime();
        const yesterdayLengthMins = Math.floor(yesterdayLengthMs / 60000);

        diffValue = lengthMins - yesterdayLengthMins;
        difference = `${Math.abs(diffValue)}${t(currentLang, "minute")}`;
      }

      return {
        length: `${hours}${t(currentLang, "hour")} ${mins}${t(currentLang, "minute")}`,
        difference: difference,
        diffValue: diffValue,
      };
    }
  );

  const formatEventTime = (event: AstroEventType | null): string => {
    if (!event) return "";
    return event.time.toLocaleTimeString("nb-NO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Schedule next astro data refresh
  let astroTimeout: ReturnType<typeof setTimeout> | null = null;

  const scheduleNextAstroRefresh = () => {
    if (astroTimeout) {
      clearTimeout(astroTimeout);
    }

    if (!astroData) return;

    const now = new Date();
    const events: Date[] = [];

    // Add today's events
    if (astroData.sunrise) events.push(new Date(astroData.sunrise.time));
    if (astroData.sunset) events.push(new Date(astroData.sunset.time));
    if (astroData.moonrise) events.push(new Date(astroData.moonrise.time));
    if (astroData.moonset) events.push(new Date(astroData.moonset.time));

    // Add tomorrow's events
    if (tomorrowAstroData) {
      if (tomorrowAstroData.sunrise)
        events.push(new Date(tomorrowAstroData.sunrise.time));
      if (tomorrowAstroData.sunset)
        events.push(new Date(tomorrowAstroData.sunset.time));
      if (tomorrowAstroData.moonrise)
        events.push(new Date(tomorrowAstroData.moonrise.time));
      if (tomorrowAstroData.moonset)
        events.push(new Date(tomorrowAstroData.moonset.time));
    }

    // Find next event in the future
    const futureEvents = events
      .filter((e) => e > now)
      .sort((a, b) => a.getTime() - b.getTime());

    if (futureEvents.length > 0) {
      const nextEvent = futureEvents[0];
      const msUntilEvent = nextEvent.getTime() - now.getTime();

      // Refresh 30 seconds after the event occurs
      const msUntilRefresh = msUntilEvent + 30000;

      console.log(
        `Next astro event in ${Math.round(msUntilEvent / 60000)} minutes, refreshing in ${Math.round(msUntilRefresh / 60000)} minutes`
      );

      astroTimeout = setTimeout(() => {
        fetchAstroData();
      }, msUntilRefresh);
    }
  };

  // Watch astroData changes to schedule next refresh
  $effect(() => {
    if (astroData) {
      scheduleNextAstroRefresh();
    }
  });

  onMount(() => {
    const interval = setInterval(() => {
      currentTime = new Date();
    }, 1000);

    // Fetch astro data on mount
    fetchAstroData();

    return () => {
      clearInterval(interval);
      if (astroTimeout) {
        clearTimeout(astroTimeout);
      }
    };
  });

  const formattedDate = $derived(
    currentTime.toLocaleDateString("nb-NO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  const formattedTime = $derived(
    currentTime.toLocaleTimeString("nb-NO", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
</script>

<svelte:head>
  <title>{t(currentLang, "title")}</title>
</svelte:head>

<div
  class="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 md:p-6 lg:p-8 overflow-hidden flex flex-col"
>
  <div class="max-w-7xl mx-auto w-full flex flex-col h-full">
    <!-- Settings button -->
    <div class="flex justify-end mb-2 flex-shrink-0">
      <button
        onclick={() => (isSettingsOpen = true)}
        class="p-2 md:p-3 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 transition-colors"
        aria-label={t(currentLang, "settings")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 md:h-6 md:w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </div>

    <!-- Header with date and time -->
    <header class="mb-4 md:mb-6 lg:mb-8 flex-shrink-0">
      <div class="flex items-center justify-center gap-4 md:gap-8 lg:gap-12">
        <!-- Most recent events (left) -->
        <div class="flex flex-col min-w-[160px] items-end">
          {#if astroEvents.mostRecentSun}
            <AstroEvent
              event={astroEvents.mostRecentSun}
              formatTime={formatEventTime}
              getDirection={getCompassDirection}
              getTimeDiff={getTimeDifference}
            />
          {/if}
          {#if astroEvents.mostRecentMoon}
            <AstroEvent
              event={astroEvents.mostRecentMoon}
              formatTime={formatEventTime}
              getDirection={getCompassDirection}
              getTimeDiff={getTimeDifference}
            />
          {/if}
        </div>

        <!-- Clock (center) -->
        <div class="text-center">
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-2">
            {formattedTime}
          </h1>
          <p class="text-lg md:text-xl lg:text-2xl text-slate-300">
            {formattedDate}
          </p>
          {#if dayLengthInfo}
            <div class="flex items-center justify-center gap-2 text-sm text-slate-400 mt-1">
              <WeatherIcon icon="horizon" size={20} />
              <span>{dayLengthInfo.length}</span>
              {#if dayLengthInfo.difference}
                <span class={dayLengthInfo.diffValue >= 0 ? "text-green-400" : "text-red-400"}>
                  {dayLengthInfo.difference}
                </span>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Next upcoming events (right) -->
        <div class="flex flex-col gap-3 min-w-[160px] items-start">
          {#if astroEvents.nextUpcomingSun}
            <AstroEvent
              event={astroEvents.nextUpcomingSun}
              formatTime={formatEventTime}
              getDirection={getCompassDirection}
              getTimeDiff={getTimeDifference}
            />
          {/if}
          {#if astroEvents.nextUpcomingMoon}
            <AstroEvent
              event={astroEvents.nextUpcomingMoon}
              formatTime={formatEventTime}
              getDirection={getCompassDirection}
              getTimeDiff={getTimeDifference}
            />
          {/if}
        </div>
      </div>
    </header>

    <!-- Main dashboard grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <!-- Weather widget -->
      <div
        class="bg-slate-800/50 backdrop-blur rounded-2xl p-4 md:p-4 border border-slate-700 flex flex-col min-h-0"
      >
        <div>
          <Weather />
        </div>
      </div>

      <!-- Calendar widget -->
      <div
        class="bg-slate-800/50 backdrop-blur rounded-2xl p-4 md:p-6 border border-slate-700 flex flex-col min-h-0"
      >
        <h2
          class="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2 flex-shrink-0"
        >
          <span>📅</span>
          {t(currentLang, "upcomingEvents")}
        </h2>
        <div>
          <Calendar />
        </div>
      </div>

      <!-- Commute widget -->
      <div
        class="bg-slate-800/50 backdrop-blur rounded-2xl p-4 md:p-6 border border-slate-700 flex flex-col min-h-0"
      >
        <h2
          class="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2 flex-shrink-0"
        >
          <span>🚇</span>
          {t(currentLang, "commuteInfo")}
        </h2>
        <div>
          <Commute />
        </div>
      </div>
    </div>
  </div>
</div>

<Settings isOpen={isSettingsOpen} onClose={() => (isSettingsOpen = false)} />
