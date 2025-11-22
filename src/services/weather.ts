// Weather service using OpenWeather API
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_KEY;
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

// Bangalore coordinates (always use these)
const BANGALORE_LAT = 12.9716;
const BANGALORE_LON = 77.5946;

export interface WeatherForecast {
  dt: number; // Unix timestamp
  dt_txt: string; // Date text "YYYY-MM-DD HH:mm:ss"
  main: {
    temp: number; // Temperature in Kelvin
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  clouds: {
    all: number; // Cloud coverage %
  };
  wind: {
    speed: number; // Wind speed in m/s
    deg: number; // Wind direction in degrees
    gust?: number;
  };
  visibility?: number;
  pop?: number; // Probability of precipitation
  rain?: {
    "3h": number; // Rain volume for last 3 hours in mm
  };
}

export interface WeatherForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: WeatherForecast[];
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

/**
 * Get weather forecast for a specific date
 * @param targetDate - The date to get forecast for (ISO string or Date object)
 * @returns Weather forecast data filtered for the target date
 */
export const getWeatherForecastForDate = async (
  targetDate: string | Date
): Promise<WeatherForecast[]> => {
  if (!OPENWEATHER_API_KEY) {
    throw new Error("OpenWeather API key is not configured");
  }

  // Convert target date to Date object and get date string (YYYY-MM-DD)
  const date = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  const targetDateStr = date.toISOString().split("T")[0]; // Get YYYY-MM-DD

  try {
    // Fetch 5-day forecast (3-hour intervals)
    const url = `${OPENWEATHER_BASE_URL}/forecast?lat=${BANGALORE_LAT}&lon=${BANGALORE_LON}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Weather API error: ${response.statusText}`
      );
    }

    const data: WeatherForecastResponse = await response.json();

    // Filter forecasts for the target date
    const forecastsForDate = data.list.filter((forecast) => {
      const forecastDateStr = forecast.dt_txt.split(" ")[0]; // Get YYYY-MM-DD
      return forecastDateStr === targetDateStr;
    });

    return forecastsForDate;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch weather forecast");
  }
};

/**
 * Get aggregated daily weather for a specific date
 * Returns average/min/max values for the day
 */
export const getDailyWeatherForDate = async (
  targetDate: string | Date
): Promise<{
  date: string;
  forecasts: WeatherForecast[];
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  avgHumidity: number;
  avgWindSpeed: number;
  description: string;
  icon: string;
  chanceOfRain: number;
  alerts: Array<{
    id: string;
    severity: "warning" | "critical";
    title: string;
    description: string;
    icon: string;
    time?: string;
  }>;
}> => {
  const forecasts = await getWeatherForecastForDate(targetDate);

  if (forecasts.length === 0) {
    throw new Error("No weather forecast available for the selected date");
  }

  // Calculate aggregates
  const temps = forecasts.map((f) => f.main.temp);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

  const avgHumidity =
    forecasts.reduce((sum, f) => sum + f.main.humidity, 0) / forecasts.length;

  const avgWindSpeed =
    forecasts.reduce((sum, f) => sum + f.wind.speed, 0) / forecasts.length;

  // Get most common weather description (or first one)
  const mainForecast = forecasts[Math.floor(forecasts.length / 2)]; // Get middle forecast
  const description =
    mainForecast.weather[0].description;
  const icon = mainForecast.weather[0].icon;

  // Calculate max chance of rain
  const chanceOfRain = Math.max(
    ...forecasts.map((f) => (f.pop || 0) * 100),
    0
  );

  const date = typeof targetDate === "string" 
    ? new Date(targetDate).toISOString().split("T")[0]
    : targetDate.toISOString().split("T")[0];

  // Detect weather anomalies and generate alerts
  const { detectWeatherAnomalies } = await import("@/utils/weatherAlerts");
  const alerts = detectWeatherAnomalies(forecasts);

  return {
    date,
    forecasts,
    avgTemp: Math.round(avgTemp),
    minTemp: Math.round(minTemp),
    maxTemp: Math.round(maxTemp),
    avgHumidity: Math.round(avgHumidity),
    avgWindSpeed: Math.round(avgWindSpeed * 10) / 10,
    description,
    icon,
    chanceOfRain: Math.round(chanceOfRain),
    alerts,
  };
};

