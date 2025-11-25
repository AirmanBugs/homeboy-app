// MET Norway API response types
export interface MetWeatherResponse {
  type: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    meta: {
      updated_at: string;
      units: {
        air_temperature: string;
        precipitation_amount: string;
        wind_speed: string;
      };
    };
    timeseries: TimeseriesEntry[];
  };
}

export interface TimeseriesEntry {
  time: string;
  data: {
    instant: {
      details: InstantDetails;
    };
    next_1_hours?: {
      summary: {
        symbol_code: string;
      };
      details: {
        precipitation_amount: number;
      };
    };
    next_6_hours?: {
      summary: {
        symbol_code: string;
      };
      details: {
        precipitation_amount: number;
      };
    };
    next_12_hours?: {
      summary: {
        symbol_code: string;
      };
    };
  };
}

export interface InstantDetails {
  air_temperature: number;
  cloud_area_fraction: number;
  relative_humidity: number;
  wind_from_direction: number;
  wind_speed: number;
  precipitation_amount?: number;
  fog_area_fraction?: number;
  ultraviolet_index_clear_sky?: number;
}

// Simplified weather data for our UI
export interface WeatherData {
  current: {
    temperature: number;
    symbolCode: string;
    windSpeed: number;
    windDirection: number;
    cloudCover: number;
    humidity: number;
    precipitation: number;
    fog: number;
    uvIndex: number;
  };
  forecast: Forecast[];
  dailyForecast: Forecast[];
  location: {
    lat: number;
    lon: number;
  };
  updatedAt: string;
  moonPhase?: number; // 0-1 representing moon phase (0=new, 0.5=full)
}

export interface Forecast {
  time: string;
  temperature: number;
  symbolCode: string;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
}
