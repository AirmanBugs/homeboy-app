<script lang="ts">
  import { onMount } from "svelte";
  import {
    isMockEnabled,
    toggleMocks,
    getWeatherScenarios,
    getCalendarScenarios,
    getCurrentWeatherScenario,
    getCurrentCalendarScenario,
    setWeatherScenario,
    setCalendarScenario,
    type WeatherScenario,
    type CalendarScenario
  } from "$lib/mocks";

  let mocksEnabled = $state(false);
  let currentWeatherScenario = $state<WeatherScenario | null>(null);
  let currentCalendarScenario = $state<CalendarScenario | null>(null);
  let weatherScenarios = $state<Record<string, WeatherScenario>>({});
  let calendarScenarios = $state<Record<string, CalendarScenario>>({});
  let isOpen = $state(false);

  onMount(() => {
    mocksEnabled = isMockEnabled();
    currentWeatherScenario = getCurrentWeatherScenario();
    currentCalendarScenario = getCurrentCalendarScenario();
    weatherScenarios = getWeatherScenarios();
    calendarScenarios = getCalendarScenarios();
  });

  const handleToggleMocks = () => {
    mocksEnabled = !mocksEnabled;
    toggleMocks(mocksEnabled);
    // Reload page to apply changes
    window.location.reload();
  };

  const handleWeatherScenarioChange = (scenarioId: string) => {
    setWeatherScenario(scenarioId);
    currentWeatherScenario = weatherScenarios[scenarioId];
    // Reload page to apply changes
    window.location.reload();
  };

  const handleCalendarScenarioChange = (scenarioId: string) => {
    setCalendarScenario(scenarioId);
    currentCalendarScenario = calendarScenarios[scenarioId];
    // Reload page to apply changes
    window.location.reload();
  };
</script>

<!-- Dev Tools Toggle Button -->
<button
  onclick={() => (isOpen = !isOpen)}
  class="fixed bottom-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg"
  title="Development Tools"
>
  🛠️
</button>

<!-- Dev Tools Panel -->
{#if isOpen}
  <div
    class="fixed bottom-20 right-4 z-50 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl w-80 max-h-[80vh] overflow-y-auto"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-slate-100">Dev Tools</h3>
      <button
        onclick={() => (isOpen = false)}
        class="text-slate-400 hover:text-slate-200"
      >
        ✕
      </button>
    </div>

    <!-- Mock Toggle -->
    <div class="mb-4">
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={mocksEnabled}
          onchange={handleToggleMocks}
          class="w-4 h-4"
        />
        <span class="text-sm text-slate-300">Enable Mock Data</span>
      </label>
      <p class="text-xs text-slate-500 mt-1">
        Use mock data instead of real APIs
      </p>
    </div>

    <!-- Weather Scenario Selector -->
    {#if mocksEnabled && currentWeatherScenario}
      <div class="mb-4">
        <label class="block text-sm text-slate-300 mb-2">Weather Scenario</label>
        <select
          value={currentWeatherScenario.id}
          onchange={(e) => handleWeatherScenarioChange((e.target as HTMLSelectElement).value)}
          class="w-full bg-slate-700 text-slate-200 border border-slate-600 rounded px-3 py-2 text-sm"
        >
          {#each Object.values(weatherScenarios) as scenario}
            <option value={scenario.id}>{scenario.name}</option>
          {/each}
        </select>
        <p class="text-xs text-slate-500 mt-1">
          {currentWeatherScenario.description}
        </p>
      </div>
    {/if}

    <!-- Calendar Scenario Selector -->
    {#if mocksEnabled && currentCalendarScenario}
      <div>
        <label class="block text-sm text-slate-300 mb-2">Calendar Scenario</label>
        <select
          value={currentCalendarScenario.id}
          onchange={(e) => handleCalendarScenarioChange((e.target as HTMLSelectElement).value)}
          class="w-full bg-slate-700 text-slate-200 border border-slate-600 rounded px-3 py-2 text-sm"
        >
          {#each Object.values(calendarScenarios) as scenario}
            <option value={scenario.id}>{scenario.name}</option>
          {/each}
        </select>
        <p class="text-xs text-slate-500 mt-1">
          {currentCalendarScenario.description}
        </p>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Override checkbox styles to work with dark theme */
  input[type="checkbox"] {
    accent-color: #9333ea;
  }
</style>
