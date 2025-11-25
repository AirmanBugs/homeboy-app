import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const USER_AGENT = "HomeBoy/1.0 mariusmbang@gmail.com";
const MET_SUNRISE_URL = "https://api.met.no/weatherapi/sunrise/3.0/moon";

interface MoonPhaseResponse {
  properties: {
    moonphase: number;
  };
}

export const GET: RequestHandler = async ({ url }) => {
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (!lat || !lon) {
    return json({ error: "Missing lat or lon parameters" }, { status: 400 });
  }

  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    const response = await fetch(
      `${MET_SUNRISE_URL}?lat=${lat}&lon=${lon}&date=${today}&offset=+01:00`,
      {
        headers: {
          "User-Agent": USER_AGENT,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`MET Sunrise API returned ${response.status}`);
    }

    const data: MoonPhaseResponse = await response.json();

    // Extract moon phase value from properties.moonphase
    // API returns percentage (0-100), convert to 0-1 range
    const moonPhasePercentage = data?.properties?.moonphase;

    if (moonPhasePercentage === undefined || moonPhasePercentage === null) {
      console.error("Unexpected moon phase response structure:", data);
      return json({
        moonPhase: 0,
        description: "Unknown",
      });
    }

    // Convert from percentage (0-100) to fraction (0-1)
    const moonPhaseValue = moonPhasePercentage / 100;

    return json({
      moonPhase: moonPhaseValue,
      description: `${moonPhasePercentage.toFixed(1)}% illuminated`,
    });
  } catch (error) {
    console.error("Moon phase API error:", error);
    return json({ error: "Failed to fetch moon phase data" }, { status: 500 });
  }
};
