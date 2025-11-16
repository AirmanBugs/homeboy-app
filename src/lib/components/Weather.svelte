<script lang="ts">
  import type { WeatherData } from "$lib/types/weather";
  import { language } from "$lib/stores/language";
  import { t } from "$lib/i18n/translations";
  import { onMount } from "svelte";
  import PrecipitationGraph from "./PrecipitationGraph.svelte";
  import RadarMap from "./RadarMap.svelte";
  import WeatherIcon from "./WeatherIcon.svelte";
  import {
    getWeatherIconName,
    getUVIndexIconName,
    getMoonPhaseIconName,
  } from "$lib/utils/weatherIconMap";

  let weatherData = $state<WeatherData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let lastFetch = $state<Date | null>(null);
  let currentCoords = $state<{ lat: number; lon: number } | null>(null);
  let usingDefaultLocation = $state(true);
  let moonPhase = $state<number | null>(null);

  const currentLang = $derived($language);

  // Default to Oslo
  const DEFAULT_LAT = 59.9139;
  const DEFAULT_LON = 10.7522;

  // Refresh every 10 minutes (MET Norway recommends not more frequent than this)
  const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

  // Get Beaufort scale icon based on wind speed (m/s)
  const getBeaufortIcon = (windSpeed: number): string => {
    if (windSpeed < 0.5) return "wind-beaufort-0"; // Calm
    if (windSpeed < 1.6) return "wind-beaufort-1"; // Light air
    if (windSpeed < 3.4) return "wind-beaufort-2"; // Light breeze
    if (windSpeed < 5.5) return "wind-beaufort-3"; // Gentle breeze
    if (windSpeed < 8.0) return "wind-beaufort-4"; // Moderate breeze
    if (windSpeed < 10.8) return "wind-beaufort-5"; // Fresh breeze
    if (windSpeed < 13.9) return "wind-beaufort-6"; // Strong breeze
    if (windSpeed < 17.2) return "wind-beaufort-7"; // Near gale
    if (windSpeed < 20.8) return "wind-beaufort-8"; // Gale
    if (windSpeed < 24.5) return "wind-beaufort-9"; // Strong gale
    if (windSpeed < 28.5) return "wind-beaufort-10"; // Storm
    if (windSpeed < 32.7) return "wind-beaufort-11"; // Violent storm
    return "wind-beaufort-12"; // Hurricane
  };

  // Format numbers with proper locale-specific decimal separator
  const formatNumber = (value: number, decimals: number = 0): string => {
    const locale = currentLang === "no" ? "nb-NO" : "en-US";
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  // Get wind arrow color based on wind speed (Beaufort scale approximation)
  const getWindColor = (windSpeed: number): string => {
    if (windSpeed < 2) return "text-slate-500"; // Calm
    if (windSpeed < 4) return "text-blue-400"; // Light breeze
    if (windSpeed < 7) return "text-yellow-400"; // Moderate
    if (windSpeed < 10) return "text-orange-400"; // Fresh
    return "text-red-400"; // Strong
  };

  // Calculate realfeel temperature (feels-like temperature)
  const calculateRealfeel = (
    temp: number,
    windSpeed: number,
    humidity: number
  ): number => {
    // For temperatures below 10°C, use wind chill
    if (temp < 10) {
      // Wind chill formula (metric)
      const windKmh = windSpeed * 3.6; // Convert m/s to km/h
      if (windKmh > 4.8) {
        const windChill =
          13.12 +
          0.6215 * temp -
          11.37 * Math.pow(windKmh, 0.16) +
          0.3965 * temp * Math.pow(windKmh, 0.16);
        return windChill;
      }
    }

    // For temperatures above 20°C, use heat index
    if (temp > 20) {
      // Heat index formula
      const T = temp;
      const RH = humidity;

      const HI =
        -8.78469475556 +
        1.61139411 * T +
        2.33854883889 * RH +
        -0.14611605 * T * RH +
        -0.012308094 * T * T +
        -0.0164248277778 * RH * RH +
        0.002211732 * T * T * RH +
        0.00072546 * T * RH * RH +
        -0.000003582 * T * T * RH * RH;

      if (HI > temp) return HI;
    }

    // For moderate temperatures or low wind, just apply a small wind adjustment
    return temp - windSpeed * 0.5;
  };

  // Get temperature color based on value
  const getTempColor = (temp: number): string => {
    if (temp <= -10) return "from-blue-600 to-blue-400";
    if (temp <= 0) return "from-cyan-600 to-cyan-400";
    if (temp <= 10) return "from-sky-500 to-sky-300";
    if (temp <= 20) return "from-green-500 to-green-300";
    if (temp <= 25) return "from-yellow-500 to-yellow-300";
    if (temp <= 30) return "from-orange-500 to-orange-300";
    return "from-red-600 to-red-400";
  };

  // Update time display every minute
  let currentTime = $state(new Date());

  const getTimeSinceUpdate = $derived.by(() => {
    if (!lastFetch) return "";
    // Force reactivity by referencing currentTime
    currentTime;
    const now = new Date();
    const diffMs = now.getTime() - lastFetch.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return currentLang === "en" ? "Just now" : "Akkurat nå";
    } else if (diffMins === 1) {
      return currentLang === "en" ? "1 min ago" : "1 min siden";
    } else {
      return currentLang === "en"
        ? `${diffMins} mins ago`
        : `${diffMins} min siden`;
    }
  });

  // Get precipitation summary for next 6 hours
  const getPrecipitationSummary = $derived.by(() => {
    if (!weatherData) return null;
    const totalPrecip = weatherData.forecast
      .slice(0, 6)
      .reduce((sum, h) => sum + h.precipitation, 0);
    if (totalPrecip === 0) return null;

    const rainHours = weatherData.forecast
      .slice(0, 6)
      .filter((h) => h.precipitation > 0);
    if (rainHours.length === 0) return null;

    const firstRain = rainHours[0];
    const firstHour = new Date(firstRain.time).getHours();

    return {
      total: totalPrecip,
      firstHour,
      count: rainHours.length,
    };
  });

  // Calculate realfeel temperature
  const realfeel = $derived.by(() => {
    if (!weatherData) return null;
    return calculateRealfeel(
      weatherData.current.temperature,
      weatherData.current.windSpeed,
      weatherData.current.humidity
    );
  });

  // Weather details grid data
  const weatherDetails = $derived.by(() => {
    if (!weatherData) return [];

    return [
      {
        icon: getBeaufortIcon(weatherData.current.windSpeed),
        value: weatherData.current.windSpeed,
        label: currentLang === "en" ? "Wind speed" : "Vindhastighet",
        format: (v: number) => formatNumber(v, 1),
      },
      {
        icon: "cloudy",
        value: Math.round(weatherData.current.cloudCover),
        label: currentLang === "en" ? "Cloud coverage" : "Skydekke",
        format: (v: number) => v.toString(),
      },
      {
        icon: "raindrop",
        value: weatherData.current.precipitation,
        label:
          currentLang === "en"
            ? "Precipitation next hour"
            : "Nedbør neste time",
        format: (v: number) => formatNumber(v, 1),
      },
      {
        icon: "humidity",
        value: weatherData.current.humidity,
        label:
          currentLang === "en" ? "Relative humidity" : "Relativ luftfuktighet",
        format: (v: number) => Math.round(v).toString(),
      },
      {
        icon: getUVIndexIconName(weatherData.current.uvIndex),
        value: weatherData.current.uvIndex,
        label: currentLang === "en" ? "UV Index" : "UV-indeks",
        format: (v: number) => Math.round(v).toString(),
      },
      ...(moonPhase !== null
        ? [
            {
              icon: getMoonPhaseIconName(moonPhase),
              value: moonPhase * 100,
              label: currentLang === "en" ? "Moon phase" : "Månefase",
              format: (v: number) => Math.round(v).toString(),
            },
          ]
        : []),
    ];
  });

  const fetchWeather = async (
    lat: number,
    lon: number,
    silent: boolean = false
  ) => {
    try {
      if (!silent) loading = true;
      error = null;
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);

      if (!response.ok) {
        throw new Error("Failed to fetch weather");
      }

      weatherData = await response.json();
      currentCoords = { lat, lon };
      lastFetch = new Date();

      // Fetch moon phase in the background
      fetchMoonPhase(lat, lon);
    } catch (err) {
      if (!silent) {
        error =
          currentLang === "en"
            ? "Failed to load weather"
            : "Kunne ikke laste værdata";
      }
      console.error("Weather fetch error:", err);
    } finally {
      if (!silent) loading = false;
    }
  };

  const fetchMoonPhase = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/moon?lat=${lat}&lon=${lon}`);
      if (response.ok) {
        const data = await response.json();
        moonPhase = data.moonPhase;
      }
    } catch (err) {
      console.error("Moon phase fetch error:", err);
      // Don't show error to user, moon phase is optional
    }
  };

  const refreshWeather = () => {
    if (currentCoords) {
      // Silent refresh - don't show loading spinner
      fetchWeather(currentCoords.lat, currentCoords.lon, true);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    // Try to get actual location in the background
    navigator.geolocation.getCurrentPosition(
      (position) => {
        usingDefaultLocation = false;
        fetchWeather(position.coords.latitude, position.coords.longitude, true);
      },
      (err) => {
        console.log(
          "Geolocation unavailable, using default location:",
          err.message
        );
        // Keep using default location, don't show error
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  onMount(() => {
    // Start with Oslo immediately
    fetchWeather(DEFAULT_LAT, DEFAULT_LON);

    // Try to get actual location in background
    requestLocation();

    // Update current time every minute for "time since update" display
    const timeInterval = setInterval(() => {
      currentTime = new Date();
    }, 60000);

    // Set up auto-refresh every 10 minutes
    const refreshInterval = setInterval(() => {
      refreshWeather();
    }, REFRESH_INTERVAL);

    // Cleanup intervals on component unmount
    return () => {
      clearInterval(timeInterval);
      clearInterval(refreshInterval);
    };
  });
</script>

<div class="h-full flex flex-col gap-2">
  {#if loading}
    <div class="flex items-center justify-center h-full">
      <div class="text-slate-400">
        {currentLang === "en" ? "Loading weather..." : "Laster værdata..."}
      </div>
    </div>
  {:else if weatherData}
    <!-- Current Weather -->
    <div class="flex items-center justify-between">
      <!-- Temperature and weather type -->
      <div class="flex items-center gap-1">
        <!-- Temperature -->
        <div class="flex-shrink-0">
          <div
            class="text-4xl font-bold leading-none text-center bg-gradient-to-br {getTempColor(
              weatherData.current.temperature
            )} bg-clip-text text-transparent"
          >
            {Math.round(weatherData.current.temperature)}°
          </div>
          {#if realfeel !== null}
            <div
              class="text-4xl font-bold mt-1 bg-gradient-to-br {getTempColor(
                realfeel
              )} bg-clip-text text-transparent opacity-80"
              title={currentLang === "en"
                ? "Feels like temperature"
                : "Føles som temperatur"}
            >
              {Math.round(realfeel)}°
            </div>
          {/if}
        </div>

        <!-- Weather Symbol -->
        <div
          class="w-14 h-14 flex items-center justify-center cursor-help flex-shrink-0 overflow-hidden"
          title={weatherData.current.symbolCode
            .replace(/_/g, " ")
            .replace(/day|night/g, "")
            .trim()}
        >
          <WeatherIcon
            icon={getWeatherIconName(weatherData.current.symbolCode)}
            size={56}
          />
        </div>
      </div>

      <!-- Weather Details Grid -->
      <div
        class="grid grid-cols-3 grid-rows-2 grid-flow-col gap-x-6 gap-y-2 text-lg min-w-[100px]"
      >
        {#each weatherDetails as detail}
          <div
            class="flex items-center justify-between cursor-help"
            title={detail.label}
          >
            <span class="flex items-center justify-center flex-shrink-0">
              <WeatherIcon icon={detail.icon} size={50} />
            </span>
            <span class="text-slate-100 text-left font-semibold text-2xl"
              >{detail.format(detail.value)}</span
            >
          </div>
        {/each}
      </div>
    </div>

    <!-- Fog alert if present -->
    {#if weatherData.current.fog > 0}
      <div class="mb-4 p-2 bg-slate-700/30 border border-slate-600 rounded-lg">
        <div
          class="flex items-center gap-2 text-sm cursor-help"
          title={currentLang === "en" ? "Fog coverage" : "Tåkedekke"}
        >
          <WeatherIcon icon="fog" size={24} />
          <span class="text-slate-300">
            {currentLang === "en" ? "Fog" : "Tåke"}
            {Math.round(weatherData.current.fog)}%
          </span>
        </div>
      </div>
    {/if}

    <!-- Precipitation Alert -->
    {#if getPrecipitationSummary}
      <div class="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
        <div class="flex items-center gap-2 text-sm">
          <WeatherIcon icon="raindrop" size={20} />
          <span class="text-blue-200">
            {#if currentLang === "en"}
              {formatNumber(getPrecipitationSummary.total, 1)}mm rain expected
              (starting around {getPrecipitationSummary.firstHour}:00)
            {:else}
              {formatNumber(getPrecipitationSummary.total, 1)}mm regn ventet
              (starter rundt {getPrecipitationSummary.firstHour}:00)
            {/if}
          </span>
        </div>
      </div>
    {/if}

    <!-- Precipitation Graph -->
    <div class="p-4 bg-slate-700/30 border border-slate-600 rounded-xl">
      <PrecipitationGraph
        lat={weatherData.location.lat}
        lon={weatherData.location.lon}
      />
    </div>

    <!-- Weather Radar -->
    <div>
      <RadarMap />
    </div>

    <!-- Forecast -->
    <div class="flex gap-2 overflow-x-auto pb-1">
      {#each weatherData.forecast.slice(0, 6) as hour}
        <div
          class="flex flex-col items-center min-w-[56px] cursor-help"
          title={currentLang === "en"
            ? `${new Date(hour.time).getHours()}:00 - ${Math.round(hour.temperature)}°C, Wind: ${formatNumber(hour.windSpeed, 1)}m/s${hour.precipitation > 0 ? `, Rain: ${formatNumber(hour.precipitation, 1)}mm` : ""}`
            : `${new Date(hour.time).getHours()}:00 - ${Math.round(hour.temperature)}°C, Vind: ${formatNumber(hour.windSpeed, 1)}m/s${hour.precipitation > 0 ? `, Regn: ${formatNumber(hour.precipitation, 1)}mm` : ""}`}
        >
          <div class="text-xs text-slate-400">
            {new Date(hour.time).getHours()}:00
          </div>
          <WeatherIcon icon={getWeatherIconName(hour.symbolCode)} size={32} />
          <div
            class="text-sm font-semibold bg-gradient-to-br {getTempColor(
              hour.temperature
            )} bg-clip-text text-transparent"
          >
            {Math.round(hour.temperature)}°
          </div>
          <div class="flex items-center gap-0.5 text-xs text-slate-400">
            <WeatherIcon icon={getBeaufortIcon(hour.windSpeed)} size={16} />
            <span>{formatNumber(hour.windSpeed, 1)}</span>
          </div>
          {#if hour.precipitation > 0}
            <div class="text-xs text-blue-300 flex items-center gap-0.5">
              <WeatherIcon icon="raindrop" size={12} />{formatNumber(
                hour.precipitation,
                1
              )}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
