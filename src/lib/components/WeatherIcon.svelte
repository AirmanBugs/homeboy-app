<script lang="ts" module>
  // Cache for loaded SVGs (shared across all instances)
  const svgCache = new Map<string, string>();
</script>

<script lang="ts">
  interface Props {
    icon: string;
    size?: number;
    class?: string;
  }

  let { icon, size = 48, class: className = "" }: Props = $props();

  let svgContent = $state<string>("");
  let loading = $state(true);
  let error = $state(false);
  let currentIcon = $state<string>("");

  const loadIcon = async (iconName: string, isInitialLoad: boolean = false) => {
    try {
      // Only show loading state on initial load
      if (isInitialLoad) {
        loading = true;
      }
      error = false;

      // Check cache first
      if (svgCache.has(iconName)) {
        svgContent = svgCache.get(iconName)!;
        currentIcon = iconName;
        if (isInitialLoad) loading = false;
        return;
      }

      // Load from local static folder
      const url = `/icons/${iconName}.svg`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`❌ Failed to load icon "${iconName}": ${response.status} ${response.statusText}`);
        throw new Error(`Failed to load icon: ${iconName}`);
      }

      let svg = await response.text();

      // Make symbol IDs unique to prevent conflicts
      // Meteocons use generic IDs like "a", "b" which collide when multiple SVGs are on the page
      const uniqueId = Math.random().toString(36).substr(2, 9);
      // First, replace all id attributes
      svg = svg.replace(/\sid="([^"]+)"/g, ` id="${iconName}-${uniqueId}-$1"`);
      // Then replace references (order matters - do xlink:href before href to avoid double-matching)
      svg = svg.replace(/xlink:href="#([^"]+)"/g, `xlink:href="#${iconName}-${uniqueId}-$1"`);
      svg = svg.replace(/\shref="#([^"]+)"/g, ` href="#${iconName}-${uniqueId}-$1"`);
      svg = svg.replace(/url\(#([^)]+)\)/g, `url(#${iconName}-${uniqueId}-$1)`);

      // Cache the processed SVG
      svgCache.set(iconName, svg);

      svgContent = svg;
      currentIcon = iconName;
    } catch (err) {
      console.error(`❌ Error loading weather icon "${iconName}":`, err);
      error = true;
    } finally {
      if (isInitialLoad) {
        loading = false;
      }
    }
  };

  // Load icon when it changes
  $effect(() => {
    if (icon !== currentIcon) {
      loadIcon(icon, currentIcon === "");
    }
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
</style>
