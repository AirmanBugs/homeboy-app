import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type {
  MetWeatherResponse,
  WeatherData,
  Forecast,
} from "$lib/types/weather";
import { isMockEnabled, mocks } from "$lib/mocks";

const USER_AGENT = "HomeBoy/1.0 mariusmbang@gmail.com";
const MET_API_URL =
  "https://api.met.no/weatherapi/locationforecast/2.0/compact";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (!lat || !lon) {
    return json({ error: "Missing lat or lon parameters" }, { status: 400 });
  }

  // Return mock data if mocks are enabled
  const useMocks = cookies.get('useMocks');
  const weatherScenario = cookies.get('mockWeatherScenario');
  if (isMockEnabled(useMocks)) {
    const mockData = mocks.weather(parseFloat(lat), parseFloat(lon), weatherScenario);
    return json(mockData);
  }

  try {
    const response = await fetch(`${MET_API_URL}?lat=${lat}&lon=${lon}`, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`MET API returned ${response.status}`);
    }

    const data: MetWeatherResponse = await response.json();
    const weatherData = transformWeatherData(
      data,
      parseFloat(lat),
      parseFloat(lon)
    );

    return json(weatherData);
  } catch (error) {
    console.error("Weather API error:", error);
    return json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
};

function transformWeatherData(
  metData: MetWeatherResponse,
  lat: number,
  lon: number
): WeatherData {
  const timeseries = metData.properties.timeseries;
  const current = timeseries[0];

  // Get the next 12 hours of forecasts
  const forecast: Forecast[] = timeseries.slice(1, 13).map((entry) => ({
    time: entry.time,
    temperature: entry.data.instant.details.air_temperature,
    symbolCode:
      entry.data.next_1_hours?.summary.symbol_code ||
      entry.data.next_6_hours?.summary.symbol_code ||
      "cloudy",
    precipitation: entry.data.next_1_hours?.details.precipitation_amount || 0,
    windSpeed: entry.data.instant.details.wind_speed,
    windDirection: entry.data.instant.details.wind_from_direction,
  }));

  // Get daily forecasts for the next 6 days (pick midday entries)
  const dailyForecast: Forecast[] = [];
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);
    targetDate.setHours(12, 0, 0, 0);

    // Find the closest entry to midday for this day
    const entry = timeseries.find((e) => {
      const entryDate = new Date(e.time);
      return (
        entryDate.getDate() === targetDate.getDate() &&
        entryDate.getMonth() === targetDate.getMonth() &&
        entryDate.getHours() >= 11 &&
        entryDate.getHours() <= 13
      );
    });

    if (entry) {
      dailyForecast.push({
        time: entry.time,
        temperature: entry.data.instant.details.air_temperature,
        symbolCode:
          entry.data.next_6_hours?.summary.symbol_code ||
          entry.data.next_12_hours?.summary.symbol_code ||
          "cloudy",
        precipitation:
          entry.data.next_6_hours?.details.precipitation_amount || 0,
        windSpeed: entry.data.instant.details.wind_speed,
        windDirection: entry.data.instant.details.wind_from_direction,
      });
    }
  }

  return {
    current: {
      temperature: current.data.instant.details.air_temperature,
      symbolCode:
        current.data.next_1_hours?.summary.symbol_code ||
        current.data.next_6_hours?.summary.symbol_code ||
        "cloudy",
      windSpeed: current.data.instant.details.wind_speed,
      windDirection: current.data.instant.details.wind_from_direction,
      cloudCover: current.data.instant.details.cloud_area_fraction,
      humidity: current.data.instant.details.relative_humidity,
      precipitation:
        current.data.next_1_hours?.details.precipitation_amount || 0,
      fog: current.data.instant.details.fog_area_fraction || 0,
      uvIndex: current.data.instant.details.ultraviolet_index_clear_sky || 0,
    },
    forecast,
    dailyForecast,
    location: { lat, lon },
    updatedAt: metData.properties.meta.updated_at,
  };
}
