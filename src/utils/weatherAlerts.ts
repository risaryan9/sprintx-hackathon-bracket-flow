import { WeatherForecast } from "@/services/weather";

export type AlertSeverity = "warning" | "critical";

export interface WeatherAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  icon: string;
  time?: string; // Optional: specific time when alert occurs
}

/**
 * Analyzes weather forecasts and detects anomalies that could disrupt tournaments
 */
export const detectWeatherAnomalies = (
  forecasts: WeatherForecast[]
): WeatherAlert[] => {
  const alerts: WeatherAlert[] = [];

  if (!forecasts || forecasts.length === 0) {
    return alerts;
  }

  // Analyze each forecast period
  forecasts.forEach((forecast, index) => {
    const temp = forecast.main.temp;
    const feelsLike = forecast.main.feels_like;
    const windSpeed = forecast.wind.speed;
    const windGust = forecast.wind.gust || windSpeed;
    const humidity = forecast.main.humidity;
    const rain3h = forecast.rain?.["3h"] || 0;
    const pop = forecast.pop || 0;
    const weatherMain = forecast.weather[0].main.toLowerCase();
    const weatherDesc = forecast.weather[0].description.toLowerCase();
    const visibility = forecast.visibility || 10000; // Default visibility

    // Extract time from dt_txt (format: "YYYY-MM-DD HH:mm:ss")
    const timeMatch = forecast.dt_txt.match(/\d{2}:\d{2}/);
    const time = timeMatch ? timeMatch[0] : undefined;

    // 1. RAIN DETECTION
    // Critical: Heavy rain (>10mm in 3h or >50% chance with >5mm)
    if (rain3h > 10 || (pop > 0.5 && rain3h > 5)) {
      alerts.push({
        id: `rain-critical-${index}`,
        severity: "critical",
        title: "Heavy Rain Expected",
        description: `${Math.round(rain3h)}mm of rain expected. Tournament activities may be severely disrupted.`,
        icon: "🌧️",
        time,
      });
    }
    // Warning: Light to moderate rain
    else if (rain3h > 0 || (pop > 0.3 && weatherMain === "rain")) {
      alerts.push({
        id: `rain-warning-${index}`,
        severity: "warning",
        title: "Rain Expected",
        description: `${Math.round(rain3h) || Math.round(pop * 100)}% chance of rain. May cause minor disruptions.`,
        icon: "🌦️",
        time,
      });
    }

    // 2. EXTREME HEAT DETECTION
    // Critical: Extreme heat (>35°C)
    if (temp > 35 || feelsLike > 38) {
      alerts.push({
        id: `heat-critical-${index}`,
        severity: "critical",
        title: "Extreme Heat Warning",
        description: `Temperature reaching ${Math.round(temp)}°C (feels like ${Math.round(feelsLike)}°C). High risk of heat exhaustion for players.`,
        icon: "🔥",
        time,
      });
    }
    // Warning: High temperature (>30°C but <=35°C)
    else if (temp > 30 || feelsLike > 33) {
      alerts.push({
        id: `heat-warning-${index}`,
        severity: "warning",
        title: "High Temperature",
        description: `Temperature reaching ${Math.round(temp)}°C. Players should stay hydrated and take frequent breaks.`,
        icon: "☀️",
        time,
      });
    }

    // 3. EXTREME COLD DETECTION
    // Critical: Very cold (<10°C)
    if (temp < 10 || feelsLike < 8) {
      alerts.push({
        id: `cold-critical-${index}`,
        severity: "critical",
        title: "Extreme Cold Warning",
        description: `Temperature dropping to ${Math.round(temp)}°C (feels like ${Math.round(feelsLike)}°C). Unsafe conditions for outdoor activities.`,
        icon: "🧊",
        time,
      });
    }
    // Warning: Cold weather (<15°C but >=10°C)
    else if (temp < 15 || feelsLike < 13) {
      alerts.push({
        id: `cold-warning-${index}`,
        severity: "warning",
        title: "Cold Weather",
        description: `Temperature dropping to ${Math.round(temp)}°C. Players should dress warmly.`,
        icon: "❄️",
        time,
      });
    }

    // 4. HIGH WIND DETECTION
    // Critical: Very high wind (>15 m/s or gusts >18 m/s)
    if (windSpeed > 15 || windGust > 18) {
      alerts.push({
        id: `wind-critical-${index}`,
        severity: "critical",
        title: "High Wind Warning",
        description: `Wind speeds of ${Math.round(windSpeed)} m/s with gusts up to ${Math.round(windGust)} m/s. Dangerous conditions for outdoor sports.`,
        icon: "💨",
        time,
      });
    }
    // Warning: Moderate wind (>10 m/s but <=15 m/s)
    else if (windSpeed > 10 || windGust > 13) {
      alerts.push({
        id: `wind-warning-${index}`,
        severity: "warning",
        title: "Moderate Wind",
        description: `Wind speeds of ${Math.round(windSpeed)} m/s may affect gameplay, especially for ball sports.`,
        icon: "🌬️",
        time,
      });
    }

    // 5. THUNDERSTORM DETECTION
    // Critical: Thunderstorms detected
    if (weatherMain === "thunderstorm" || weatherDesc.includes("thunder")) {
      alerts.push({
        id: `storm-critical-${index}`,
        severity: "critical",
        title: "Thunderstorm Alert",
        description: "Thunderstorms detected. All outdoor activities must be suspended immediately.",
        icon: "⛈️",
        time,
      });
    }

    // 6. LOW VISIBILITY DETECTION
    // Critical: Very low visibility (<1000m)
    if (visibility < 1000) {
      alerts.push({
        id: `visibility-critical-${index}`,
        severity: "critical",
        title: "Poor Visibility",
        description: `Visibility reduced to ${visibility}m. Safety hazard for outdoor activities.`,
        icon: "🌫️",
        time,
      });
    }
    // Warning: Reduced visibility (<3000m but >=1000m)
    else if (visibility < 3000) {
      alerts.push({
        id: `visibility-warning-${index}`,
        severity: "warning",
        title: "Reduced Visibility",
        description: `Visibility reduced to ${visibility}m. May affect gameplay.`,
        icon: "🌁",
        time,
      });
    }

    // 7. HIGH HUMIDITY DETECTION (especially with heat)
    // Warning: Very high humidity (>85%) combined with moderate heat
    if (humidity > 85 && temp > 25) {
      alerts.push({
        id: `humidity-warning-${index}`,
        severity: "warning",
        title: "High Humidity",
        description: `Humidity at ${Math.round(humidity)}% with ${Math.round(temp)}°C. Uncomfortable conditions may affect performance.`,
        icon: "💧",
        time,
      });
    }

    // 8. HEAVY CLOUD COVERAGE (may indicate upcoming severe weather)
    // Warning: Overcast skies (>90% cloud coverage) with rain probability
    if (forecast.clouds.all > 90 && pop > 0.4) {
      alerts.push({
        id: `clouds-warning-${index}`,
        severity: "warning",
        title: "Overcast with Rain Risk",
        description: `${forecast.clouds.all}% cloud coverage with ${Math.round(pop * 100)}% chance of rain. Weather may deteriorate.`,
        icon: "☁️",
        time,
      });
    }
  });

  // Remove duplicate alerts (same type for same time window)
  const uniqueAlerts = alerts.filter((alert, index, self) => {
    // Keep only the first occurrence of each alert type
    const firstIndex = self.findIndex((a) => a.id.split("-")[0] === alert.id.split("-")[0]);
    return firstIndex === index;
  });

  // Sort alerts: critical first, then by time if available
  uniqueAlerts.sort((a, b) => {
    // Critical alerts first
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (a.severity !== "critical" && b.severity === "critical") return 1;
    // Then sort by time
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });

  return uniqueAlerts;
};

/**
 * Get summary of weather conditions for the day
 */
export const getWeatherConditionSummary = (
  alerts: WeatherAlert[]
): {
  hasCriticalAlerts: boolean;
  hasWarnings: boolean;
  overallStatus: "safe" | "caution" | "danger";
} => {
  const hasCriticalAlerts = alerts.some((a) => a.severity === "critical");
  const hasWarnings = alerts.some((a) => a.severity === "warning");

  let overallStatus: "safe" | "caution" | "danger" = "safe";
  if (hasCriticalAlerts) {
    overallStatus = "danger";
  } else if (hasWarnings) {
    overallStatus = "caution";
  }

  return {
    hasCriticalAlerts,
    hasWarnings,
    overallStatus,
  };
};

