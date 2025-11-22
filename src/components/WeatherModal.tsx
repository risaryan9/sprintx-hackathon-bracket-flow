import { CloudSun, Loader2, Thermometer, Droplets, Wind, Eye, Calendar, MapPin, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { getDailyWeatherForDate, WeatherForecast } from "@/services/weather";
import { format } from "date-fns";
import { getWeatherConditionSummary } from "@/utils/weatherAlerts";

interface WeatherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentName: string;
  startDate: string;
}

const WeatherIcon = ({ icon, className = "" }: { icon: string; className?: string }) => {
  const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
  return <img src={iconUrl} alt="Weather icon" className={className} />;
};

const formatTime = (dtTxt: string) => {
  const date = new Date(dtTxt);
  return format(date, "h:mm a");
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return format(date, "EEEE, MMMM d, yyyy");
};

const getWindDirection = (deg: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
};

export const WeatherModal = ({
  open,
  onOpenChange,
  tournamentName,
  startDate,
}: WeatherModalProps) => {
  const { data: weatherData, isLoading, isError, error } = useQuery({
    queryKey: ["weather-forecast", startDate],
    queryFn: () => getDailyWeatherForDate(startDate),
    enabled: open && !!startDate,
    retry: 2,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-black/95 backdrop-blur-xl max-w-3xl w-[90vw] max-h-[85vh] overflow-hidden flex flex-col p-0 shadow-2xl text-white">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-2xl font-semibold text-white flex items-center gap-2">
            <CloudSun className="h-6 w-6 text-primary" />
            Weather Forecast
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-300">{tournamentName}</p>
            <span className="text-gray-500">•</span>
            <p className="text-sm text-gray-300">{startDate && formatDate(startDate)}</p>
            <span className="text-gray-500">•</span>
            <div className="flex items-center gap-1 text-sm text-gray-300">
              <MapPin className="h-3 w-3" />
              <span>Bangalore</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading weather forecast...</p>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
              <p className="text-sm text-red-400 mb-2">Failed to load weather forecast</p>
              <p className="text-xs text-muted-foreground text-center">
                {error instanceof Error ? error.message : "Unknown error occurred"}
              </p>
            </div>
          )}

          {weatherData && (
            <>
              {/* Weather Alerts Section */}
              {weatherData.alerts && (
                <div className="mb-6 space-y-3">
                  {(() => {
                    const alerts = weatherData.alerts || [];
                    const summary = getWeatherConditionSummary(alerts);
                    const criticalAlerts = alerts.filter(a => a.severity === "critical");
                    const warningAlerts = alerts.filter(a => a.severity === "warning");

                    return (
                      <>
                        {/* Overall Status Badge */}
                        <div className="flex items-center gap-2 mb-4">
                          {summary.overallStatus === "danger" && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50 px-4 py-1.5">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Critical Weather Conditions
                            </Badge>
                          )}
                          {summary.overallStatus === "caution" && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 px-4 py-1.5">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Weather Warnings
                            </Badge>
                          )}
                          {summary.overallStatus === "safe" && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 px-4 py-1.5">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Favorable Conditions
                            </Badge>
                          )}
                        </div>

                        {/* Critical Alerts */}
                        {criticalAlerts.length > 0 && (
                          <div className="space-y-2">
                            {criticalAlerts.map((alert) => (
                              <Alert
                                key={alert.id}
                                variant="destructive"
                                className="bg-red-500/10 border-red-500/50 text-red-400"
                              >
                                <AlertCircle className="h-5 w-5 text-red-400" />
                                <AlertTitle className="flex items-center gap-2">
                                  <span className="text-lg">{alert.icon}</span>
                                  {alert.title}
                                  {alert.time && (
                                    <Badge variant="outline" className="ml-2 bg-red-500/20 border-red-500/50 text-red-400 text-xs">
                                      {alert.time}
                                    </Badge>
                                  )}
                                </AlertTitle>
                                <AlertDescription className="text-red-300">
                                  {alert.description}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        )}

                        {/* Warning Alerts */}
                        {warningAlerts.length > 0 && (
                          <div className="space-y-2">
                            {warningAlerts.map((alert) => (
                              <Alert
                                key={alert.id}
                                className="bg-yellow-500/10 border-yellow-500/50 text-yellow-400"
                              >
                                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                <AlertTitle className="flex items-center gap-2">
                                  <span className="text-lg">{alert.icon}</span>
                                  {alert.title}
                                  {alert.time && (
                                    <Badge variant="outline" className="ml-2 bg-yellow-500/20 border-yellow-500/50 text-yellow-400 text-xs">
                                      {alert.time}
                                    </Badge>
                                  )}
                                </AlertTitle>
                                <AlertDescription className="text-yellow-300">
                                  {alert.description}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        )}

                        {/* No Alerts Message */}
                        {alerts.length === 0 && (
                          <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <AlertTitle>Favorable Weather Conditions</AlertTitle>
                            <AlertDescription className="text-green-300">
                              No weather anomalies detected. Conditions are suitable for tournament activities.
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Main Weather Summary */}
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-primary/20 to-primary/5 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <WeatherIcon icon={weatherData.icon} className="h-20 w-20" />
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-white">
                          {weatherData.avgTemp}°
                        </span>
                        <span className="text-xl text-muted-foreground">C</span>
                      </div>
                      <p className="text-lg text-white/80 capitalize mt-1">
                        {weatherData.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">High / Low</p>
                    <p className="text-xl font-semibold text-white">
                      {weatherData.maxTemp}° / {weatherData.minTemp}°
                    </p>
                  </div>
                </div>

                {/* Weather Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/10">
                      <Droplets className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Humidity</p>
                      <p className="text-lg font-semibold text-white">{weatherData.avgHumidity}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/10">
                      <Wind className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Wind</p>
                      <p className="text-lg font-semibold text-white">{weatherData.avgWindSpeed} m/s</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/10">
                      <CloudSun className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Rain Chance</p>
                      <p className="text-lg font-semibold text-white">{weatherData.chanceOfRain}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/10">
                      <Thermometer className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Feels Like</p>
                      <p className="text-lg font-semibold text-white">
                        {Math.round(weatherData.forecasts[Math.floor(weatherData.forecasts.length / 2)].main.feels_like)}°C
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hourly Forecast */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Hourly Forecast
                </h3>
                <div className="space-y-2">
                  {weatherData.forecasts.map((forecast, index) => (
                    <div
                      key={forecast.dt}
                      className="grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="col-span-3">
                        <p className="text-sm font-medium text-white">{formatTime(forecast.dt_txt)}</p>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <WeatherIcon icon={forecast.weather[0].icon} className="h-10 w-10" />
                      </div>
                      <div className="col-span-2 text-center">
                        <p className="text-sm font-semibold text-white">
                          {Math.round(forecast.main.temp)}°C
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Feels {Math.round(forecast.main.feels_like)}°
                        </p>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Droplets className="h-3 w-3 text-blue-400" />
                          <span className="text-sm text-white">{forecast.main.humidity}%</span>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Wind className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-white">
                            {forecast.wind.speed} m/s {getWindDirection(forecast.wind.deg)}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        {forecast.pop && forecast.pop > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs border-blue-500/30 bg-blue-500/10 text-blue-400"
                          >
                            {Math.round(forecast.pop * 100)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {weatherData && (
          <div className="px-6 py-4 border-t border-white/10 bg-black/30">
            <p className="text-xs text-muted-foreground text-center">
              Weather data provided by{" "}
              <a
                href="https://openweathermap.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenWeather
              </a>
              {" "}• Forecast for Bangalore, India
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

