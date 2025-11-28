<script lang="ts">
  import type { CommuteData } from "$lib/types/commute";
  import { language } from "$lib/stores/language";
  import { location } from "$lib/stores/location";
  import { onMount } from "svelte";

  let commuteData = $state<CommuteData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let currentTime = $state(new Date());

  const currentLang = $derived($language);
  const REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh every 5 minutes

  const fetchCommuteData = async () => {
    try {
      loading = true;
      error = null;

      // Get user location using shared location store
      const loc = await location.requestLocation();

      const params = new URLSearchParams({
        lat: loc.latitude.toString(),
        lon: loc.longitude.toString(),
      });

      const response = await fetch(`/api/commute?${params}`);

      if (!response.ok) {
        if (response.status === 404) {
          // No upcoming events with locations
          commuteData = null;
          return;
        }
        throw new Error("Failed to fetch commute data");
      }

      commuteData = await response.json();
      console.log("Received commute data:", commuteData);
      if (commuteData.routes) {
        console.log("Routes with steps:", commuteData.routes.map((r: any) => ({
          duration: r.duration,
          stepsCount: r.steps?.length || 0,
          steps: r.steps
        })));
      }
    } catch (err) {
      error =
        currentLang === "en"
          ? "Failed to load commute info"
          : "Kunne ikke laste reiseinformasjon";
      console.error("Commute fetch error:", err);
    } finally {
      loading = false;
    }
  };

  // Format time difference
  const getTimeDifference = (targetTime: string): string => {
    const target = new Date(targetTime);
    const diffMs = target.getTime() - currentTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) return currentLang === "en" ? "Now" : "Nå";

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours}t ${mins}m`;
    }
    return `${mins}m`;
  };

  onMount(() => {
    fetchCommuteData();

    // Update current time every minute
    const timeInterval = setInterval(() => {
      currentTime = new Date();
    }, 60000);

    // Refresh commute data periodically
    const refreshInterval = setInterval(() => {
      fetchCommuteData();
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(timeInterval);
      clearInterval(refreshInterval);
    };
  });
</script>

{#if loading}
  <div class="flex items-center justify-center h-32">
    <div class="text-slate-400">
      {currentLang === "en" ? "Loading..." : "Laster..."}
    </div>
  </div>
{:else if error}
  <div class="text-red-400 text-sm">{error}</div>
{:else if !commuteData}
  <div class="text-slate-400 text-sm">
    {currentLang === "en"
      ? "No upcoming events with locations"
      : "Ingen kommende hendelser med steder"}
  </div>
{:else}
  <div class="flex flex-col gap-3">
    <!-- Event info -->
    <div class="flex flex-col gap-1">
      <div class="font-semibold text-slate-100">{commuteData.eventSummary}</div>
      <div class="text-sm text-slate-400">{commuteData.destination}</div>
      <div class="text-xs text-slate-500">
        {new Date(commuteData.departureTime).toLocaleDateString("nb-NO", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })}
        {" "}
        {new Date(commuteData.departureTime).toLocaleTimeString("nb-NO", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>

    <!-- Routes -->
    {#if commuteData.routes.length > 0}
      <div class="flex flex-col gap-2">
        {#each commuteData.routes as route}
          <div
            class="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-lg">
                  {#if route.mode === "transit"}
                    🚇
                  {:else if route.mode === "driving"}
                    🚗
                  {:else if route.mode === "walking"}
                    🚶
                  {:else}
                    🚴
                  {/if}
                </span>
                <span class="text-sm font-medium">
                  {route.duration} {currentLang === "en" ? "min" : "min"}
                </span>
              </div>
              <div class="text-xs text-slate-400">
                {currentLang === "en" ? "Leave in" : "Dra om"}
                {getTimeDifference(route.departBy)}
              </div>
            </div>

            <!-- Route steps -->
            {#if route.steps && route.steps.length > 0}
              <div class="flex flex-col gap-1 mt-2 mb-2">
                {#each route.steps as step}
                  <div class="flex items-center gap-2 text-xs">
                    <span class="text-slate-500">
                      {#if step.mode.toLowerCase() === "foot"}
                        🚶
                      {:else if step.mode.toLowerCase() === "bus"}
                        🚌
                      {:else if step.mode.toLowerCase() === "tram"}
                        🚊
                      {:else if step.mode.toLowerCase() === "metro"}
                        🚇
                      {:else if step.mode.toLowerCase() === "rail"}
                        🚆
                      {:else if step.mode.toLowerCase() === "water"}
                        ⛴️
                      {:else}
                        🚇
                      {/if}
                    </span>
                    <span class="text-slate-300">{step.instruction}</span>
                    <span class="text-slate-500 ml-auto">{step.duration}m</span>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="text-xs text-slate-500">
              {currentLang === "en" ? "Arrive" : "Ankomst"}:
              {new Date(route.arrival).toLocaleTimeString("nb-NO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
