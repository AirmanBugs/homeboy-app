import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { CommuteData, CommuteRoute } from "$lib/types/commute";
import type { CalendarEvent } from "$lib/types/calendar";
import { google } from "googleapis";
import { createOAuth2Client, setCredentials } from "$lib/server/google-auth";
import { GraphQLClient, gql } from "graphql-request";
import { isMockEnabled, mocks } from "$lib/mocks";

const ENTUR_API_URL = "https://api.entur.io/journey-planner/v3/graphql";
const ENTUR_GEOCODER_URL = "https://api.entur.io/geocoder/v1/autocomplete";

const enturClient = new GraphQLClient(ENTUR_API_URL, {
  headers: {
    "ET-Client-Name": "homeboy",
  },
});

export const GET: RequestHandler = async ({ url, cookies }) => {
  try {
    // Get origin coordinates from query parameters
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");

    if (!lat || !lon) {
      return json(
        { error: "Missing location parameters (lat, lon)" },
        { status: 400 }
      );
    }

    const originLat = parseFloat(lat);
    const originLon = parseFloat(lon);

    if (isNaN(originLat) || isNaN(originLon)) {
      return json({ error: "Invalid location coordinates" }, { status: 400 });
    }

    // Return mock data if mocks are enabled
    const useMocks = cookies.get('useMocks');
    const calendarScenario = cookies.get('mockCalendarScenario');
    if (isMockEnabled(useMocks)) {
      const mockEvents = mocks.calendar(calendarScenario);
      const nextEvent = mockEvents.find((e) => e.location);
      if (!nextEvent) {
        return json(
          { error: "No upcoming events with locations" },
          { status: 404 }
        );
      }
      return json(mocks.commute(nextEvent));
    }

    const tokensStr = cookies.get("google_tokens");
    if (!tokensStr) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokens = JSON.parse(tokensStr);
    const oauth2Client = createOAuth2Client();
    setCredentials(oauth2Client, tokens);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const calendarList = await calendar.calendarList.list({
      showHidden: true,
    });
    const calendars = calendarList.data.items || [];

    const now = new Date().toISOString();
    const allEvents: CalendarEvent[] = [];

    await Promise.all(
      calendars.map(async (cal) => {
        if (!cal.id) return;

        try {
          const eventsResponse = await calendar.events.list({
            calendarId: cal.id,
            timeMin: now,
            maxResults: 10,
            singleEvents: true,
            orderBy: "startTime",
          });

          const events = eventsResponse.data.items || [];

          for (const event of events) {
            if (!event.start || !event.end || !event.location) continue;

            const startDate = event.start.dateTime || event.start.date;
            const endDate = event.end.dateTime || event.end.date;
            if (!startDate || !endDate) continue;

            allEvents.push({
              id: event.id || "",
              summary: event.summary || "Untitled Event",
              description: event.description || undefined,
              start: startDate,
              end: endDate,
              location: event.location,
              isAllDay: !event.start.dateTime,
              calendarId: cal.id,
              calendarName: cal.summary || "Unnamed Calendar",
              calendarColor: cal.backgroundColor || "#4285f4",
            });
          }
        } catch (error) {
          console.error(
            `Error fetching events from calendar ${cal.summary}:`,
            error
          );
        }
      })
    );

    allEvents.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    const nextEvent = allEvents.find((event) => event.location);

    if (!nextEvent) {
      return json(
        { error: "No upcoming events with locations" },
        { status: 404 }
      );
    }

    const arrivalTime = new Date(nextEvent.start);
    const destCoords = await geocodeAddress(nextEvent.location!);

    const [transitRoutes, cyclingRoute, drivingRoute] = await Promise.all([
      destCoords ? getEnturRoutes(originLat, originLon, destCoords, arrivalTime) : [],
      destCoords ? getOSRMRoute(originLat, originLon, destCoords, 'cycling', arrivalTime) : null,
      destCoords ? getOSRMRoute(originLat, originLon, destCoords, 'driving', arrivalTime) : null,
    ]);

    const routes: CommuteRoute[] = [
      ...transitRoutes,
      ...(cyclingRoute ? [cyclingRoute] : []),
      ...(drivingRoute ? [drivingRoute] : []),
    ];

    const commuteData: CommuteData = {
      destination: nextEvent.location!,
      departureTime: nextEvent.start,
      routes,
      eventSummary: nextEvent.summary,
    };

    return json(commuteData);
  } catch (error: any) {
    console.error("Commute API error:", error);

    // Handle auth errors
    if (error?.code === 400 && error?.message?.includes("invalid_grant")) {
      cookies.delete("google_tokens", { path: "/" });
      return json(
        {
          error: "Authentication expired",
          needsAuth: true,
        },
        { status: 401 }
      );
    }

    return json({ error: "Failed to fetch commute data" }, { status: 500 });
  }
};

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    // Remove country suffix
    const withoutCountry = address
      .replace(/,\s*Norway$/i, "")
      .replace(/,\s*Norge$/i, "")
      .trim();

    const parts = withoutCountry.split(",").map((s) => s.trim());

    // Build search strategies
    const strategies: string[] = [];

    // Strategy 1: Find street address (contains number + gate/vei/plass) + city
    const streetPart = parts.find((p) =>
      /\d+/.test(p) && /(gate|vei|veg|plass|street|veien)/i.test(p)
    );
    const cityPart = parts.find((p) =>
      /(oslo|bergen|trondheim|stavanger|tromsø|drammen|fredrikstad|kristiansand|sandnes|asker|bærum|skien|tønsberg)/i.test(
        p
      )
    );

    if (streetPart && cityPart) {
      // Extract just the city name from the part (e.g., "0153 Oslo" -> "Oslo")
      const cityMatch = cityPart.match(
        /(oslo|bergen|trondheim|stavanger|tromsø|drammen|fredrikstad|kristiansand|sandnes|asker|bærum|skien|tønsberg)/i
      );
      const cityName = cityMatch ? cityMatch[0] : cityPart;
      strategies.push(`${streetPart} ${cityName}`);
    } else if (streetPart) {
      strategies.push(streetPart);
    }

    // Strategy 2: Skip first part (likely venue name), use rest
    if (parts.length > 1) {
      const withoutFirstPart = parts.slice(1).join(" ").replace(/\s+/g, " ");
      if (withoutFirstPart.length > 5) {
        strategies.push(withoutFirstPart);
      }
    }

    // Strategy 3: Remove postal codes, join with spaces
    const withoutPostal = parts
      .filter((p) => !/^\d{4}$/.test(p))
      .join(" ")
      .replace(/\s+/g, " ");
    if (withoutPostal.length > 5) {
      strategies.push(withoutPostal);
    }

    // Try each strategy
    for (let i = 0; i < strategies.length; i++) {
      const searchText = strategies[i];
      const params = new URLSearchParams({
        text: searchText,
        size: "5",
        lang: "no",
      });

      console.log(`[${i + 1}/${strategies.length}] Geocoding: "${searchText}"`);

      const response = await fetch(`${ENTUR_GEOCODER_URL}?${params}`, {
        headers: {
          "ET-Client-Name": "homeboy",
        },
      });

      if (!response.ok) {
        console.error(`  ✗ HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const coords = feature.geometry.coordinates;
        const label = feature.properties?.label || "";

        console.log(`  ✓ Found: ${label} at [${coords[1]}, ${coords[0]}]`);
        return { lat: coords[1], lon: coords[0] };
      } else {
        console.log(`  ✗ No results`);
      }
    }

    console.error(`✗ Failed to geocode: "${address}"`);
    return null;
  } catch (error) {
    console.error("Geocoder exception:", error);
    return null;
  }
}

async function getOSRMRoute(
  originLat: number,
  originLon: number,
  destCoords: { lat: number; lon: number },
  profile: 'cycling' | 'driving',
  arrivalTime: Date
): Promise<CommuteRoute | null> {
  try {
    const osrmBase = profile === 'driving'
      ? 'https://routing.openstreetmap.de/routed-car'
      : 'https://routing.openstreetmap.de/routed-bike';
    const url = `${osrmBase}/route/v1/driving/${originLon},${originLat};${destCoords.lon},${destCoords.lat}?overview=false`;
    const response = await fetch(url, { headers: { 'User-Agent': 'homeboy' } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.routes?.length) return null;

    const durationSeconds: number = data.routes[0].duration;
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const departBy = new Date(arrivalTime.getTime() - durationSeconds * 1000);

    return {
      mode: profile,
      duration: durationMinutes,
      departBy: departBy.toISOString(),
      arrival: arrivalTime.toISOString(),
      steps: [],
    };
  } catch (error) {
    console.error(`OSRM ${profile} route error:`, error);
    return null;
  }
}

async function getEnturRoutes(
  originLat: number,
  originLon: number,
  destCoords: { lat: number; lon: number },
  arrivalTime: Date
): Promise<CommuteRoute[]> {
  try {
    // GraphQL query for trip planning
    const query = gql`
      query TripQuery(
        $from: Location!
        $to: Location!
        $dateTime: DateTime!
        $arriveBy: Boolean!
      ) {
        trip(
          from: $from
          to: $to
          dateTime: $dateTime
          arriveBy: $arriveBy
          numTripPatterns: 3
        ) {
          tripPatterns {
            duration
            startTime
            endTime
            legs {
              mode
              expectedStartTime
              fromPlace {
                name
              }
              toPlace {
                name
              }
              line {
                publicCode
                name
              }
              duration
            }
          }
        }
      }
    `;

    // Format dateTime with timezone for Entur (expects ISO 8601 with timezone offset)
    // Check if the arrival time string already has a timezone offset
    const arrivalTimeStr = arrivalTime.toISOString ? arrivalTime.toISOString() : String(arrivalTime);

    let formattedDateTime: string;
    if (arrivalTimeStr.includes("+") || (arrivalTimeStr.includes("T") && !arrivalTimeStr.endsWith("Z"))) {
      // Already has timezone, use as is (or extract it)
      formattedDateTime = arrivalTimeStr;
    } else {
      // Convert from UTC to Norwegian time
      const arrivalDate = new Date(arrivalTimeStr);
      const year = arrivalDate.getUTCFullYear();
      const month = String(arrivalDate.getUTCMonth() + 1).padStart(2, "0");
      const day = String(arrivalDate.getUTCDate()).padStart(2, "0");

      // Determine Norwegian timezone offset
      const norwayMonth = arrivalDate.getUTCMonth();
      const isDST = norwayMonth >= 2 && norwayMonth <= 9; // Rough DST estimate
      const offsetHours = isDST ? 2 : 1;

      const norwayHours = (arrivalDate.getUTCHours() + offsetHours) % 24;
      const minutes = String(arrivalDate.getUTCMinutes()).padStart(2, "0");
      const seconds = String(arrivalDate.getUTCSeconds()).padStart(2, "0");
      const tzOffset = isDST ? "+02:00" : "+01:00";

      formattedDateTime = `${year}-${month}-${day}T${String(norwayHours).padStart(2, "0")}:${minutes}:${seconds}${tzOffset}`;
    }

    const variables = {
      from: {
        coordinates: {
          latitude: originLat,
          longitude: originLon,
        },
      },
      to: {
        coordinates: {
          latitude: destCoords.lat,
          longitude: destCoords.lon,
        },
      },
      dateTime: formattedDateTime,
      arriveBy: true,
    };

    console.log("Requesting Entur trip with variables:", JSON.stringify(variables, null, 2));
    const data = await enturClient.request(query, variables);
    console.log("Entur response:", JSON.stringify(data, null, 2));

    if (!data.trip?.tripPatterns || data.trip.tripPatterns.length === 0) {
      console.warn("No trip patterns found in response");
      return [];
    }

    console.log(`Found ${data.trip.tripPatterns.length} trip patterns`);

    // Log route details for debugging
    data.trip.tripPatterns.forEach((pattern: any, i: number) => {
      const legs = pattern.legs.map((leg: any) => ({
        mode: leg.mode,
        line: leg.line?.publicCode || null,
        from: leg.fromPlace?.name,
        to: leg.toPlace?.name,
        duration: Math.ceil(leg.duration / 60) + "m"
      }));
      console.log(`  Route ${i + 1}: ${Math.ceil(pattern.duration / 60)}min total, legs:`, JSON.stringify(legs, null, 2));
    });

    const routes: CommuteRoute[] = data.trip.tripPatterns.map(
      (pattern: any) => {
        const durationMinutes = Math.ceil(pattern.duration / 60);

        return {
          mode: "transit" as const,
          duration: durationMinutes,
          departBy: pattern.startTime,
          arrival: pattern.endTime,
          steps: pattern.legs.map((leg: any) => ({
            mode: leg.mode,
            instruction: leg.line
              ? `${leg.line.publicCode} ${leg.line.name}`
              : `Walk to ${leg.toPlace.name}`,
            duration: Math.ceil(leg.duration / 60),
            startTime: leg.expectedStartTime,
            toPlace: leg.line ? leg.toPlace?.name : undefined,
          })),
        };
      }
    );

    console.log(`✓ Returning ${routes.length} routes`);
    return routes;
  } catch (error) {
    console.error("Entur route planning error:", error);
    return [];
  }
}
