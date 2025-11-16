import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const USER_AGENT = "HomeBoy/1.0 mariusmbang@gmail.com";
const MET_SUNRISE_URL = "https://api.met.no/weatherapi/sunrise/3.0/moon";

interface MoonPhaseResponse {
  location: {
    time: Array<{
      date: string;
      moonphase: {
        value: string;
        desc: string;
      };
    }>;
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

    const data = await response.json();

    // Extract moon phase value (0-1, where 0=new moon, 0.5=full moon)
    // Handle different possible response structures
    const timeData = data?.location?.time;
    if (!timeData || !Array.isArray(timeData) || timeData.length === 0) {
      console.error("Unexpected moon phase response structure:", data);
      // Return default value instead of erroring
      return json({
        moonPhase: 0,
        description: "Unknown",
      });
    }

    const moonPhaseValue = parseFloat(timeData[0]?.moonphase?.value || "0");

    return json({
      moonPhase: moonPhaseValue,
      description: timeData[0]?.moonphase?.desc || "Unknown",
    });
  } catch (error) {
    console.error("Moon phase API error:", error);
    return json({ error: "Failed to fetch moon phase data" }, { status: 500 });
  }
};
