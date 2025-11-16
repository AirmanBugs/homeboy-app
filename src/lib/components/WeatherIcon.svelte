<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    icon: string;
    size?: number;
    class?: string;
  }

  let { icon, size = 48, class: className = "" }: Props = $props();

  let svgContent = $state<string>("");
  let loading = $state(true);
  let error = $state(false);

  const loadIcon = async () => {
    try {
      loading = true;
      error = false;

      // Load from local static folder
      const url = `/icons/${icon}.svg`;
      console.log(`🔄 Loading icon from: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`❌ Failed to load icon "${icon}": ${response.status} ${response.statusText}`);
        console.error(`   Full URL: ${window.location.origin}${url}`);
        throw new Error(`Failed to load icon: ${icon}`);
      }

      let svg = await response.text();
      console.log(`📄 Loaded SVG for ${icon}, length: ${svg.length} chars`);

      // Make symbol IDs unique to prevent conflicts
      // Meteocons use generic IDs like "a", "b" which collide when multiple SVGs are on the page
      const uniqueId = Math.random().toString(36).substr(2, 9);
      // First, replace all id attributes
      svg = svg.replace(/\sid="([^"]+)"/g, ` id="${icon}-${uniqueId}-$1"`);
      // Then replace references (order matters - do xlink:href before href to avoid double-matching)
      svg = svg.replace(/xlink:href="#([^"]+)"/g, `xlink:href="#${icon}-${uniqueId}-$1"`);
      svg = svg.replace(/\shref="#([^"]+)"/g, ` href="#${icon}-${uniqueId}-$1"`);
      svg = svg.replace(/url\(#([^)]+)\)/g, `url(#${icon}-${uniqueId}-$1)`);

      svgContent = svg;
      console.log(`✅ Icon ready: ${icon}`);
    } catch (err) {
      console.error(`❌ Error loading weather icon "${icon}":`, err);
      error = true;
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    loadIcon();
  });

  // Reload icon when icon prop changes
  $effect(() => {
    icon;
    loadIcon();
  });
</script>

<div
  class="weather-icon inline-block {className}"
  style="width: {size}px; height: {size}px;"
  title={error ? `Failed to load: ${icon}` : icon}
>
  {#if loading}
    <div class="w-full h-full flex items-center justify-center">
      <div class="text-slate-500 text-xs">...</div>
    </div>
  {:else if error}
    <div class="w-full h-full flex items-center justify-center bg-red-500/20 rounded border border-red-500/50">
      <div class="text-red-300 text-xs font-mono truncate px-1">{icon}</div>
    </div>
  {:else}
    {@html svgContent}
  {/if}
</div>

<style>
  .weather-icon {
    position: relative;
    display: inline-block;
  }

  .weather-icon :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
    max-width: 100%;
    max-height: 100%;
  }

  /* Debug: add a border to see the container */
  /* .weather-icon {
    border: 1px solid red;
  } */
</style>
