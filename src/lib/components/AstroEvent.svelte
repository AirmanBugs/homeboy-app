<script lang="ts">
  import WeatherIcon from "./WeatherIcon.svelte";
  import type { AstroEvent } from "$lib/types/astro";

  interface Props {
    event: AstroEvent;
    formatTime: (event: AstroEvent) => string;
    getDirection: (azimuth: number) => string;
    getTimeDiff: (event: AstroEvent) => string;
  }

  let { event, formatTime, getDirection, getTimeDiff }: Props = $props();
</script>

<div class="grid grid-cols-2 grid-rows-2">
  <WeatherIcon icon={event.type} size={48} />

  <div class="text-base md:text-lg text-slate-300 text-right self-center">
    {formatTime(event)}
  </div>
  <div class="text-xs text-slate-500 col-span-2 text-right">
    {getDirection(event.azimuth)} • {getTimeDiff(event)}
  </div>
</div>
