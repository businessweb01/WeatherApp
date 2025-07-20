import React, { useState, useEffect } from 'react';
import { MapPin, Bell, BellOff, Loader2, Wind, Eye, Droplets, Gauge, CloudRain, Sunrise, Sunset, RefreshCw } from 'lucide-react';

const WeatherPushApp = () => {
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      return permission === 'granted';
    }
    return false;
  };

  // Send notification with enhanced styling
  const sendNotification = (title, body, icon = '🌤️') => {
    if (notificationsEnabled && 'Notification' in window) {
      new Notification(title, {
        body,
        icon: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icon}</text></svg>`,
        badge: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌤️</text></svg>`,
        requireInteraction: false,
        silent: false
      });
    }
  };

  // Get current location with improved UX
  const getCurrentLocation = () => {
    setLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Please enable location services in your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        sendToN8n(latitude, longitude);
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        if (error.code === 1) errorMessage = 'Location access denied. Please allow location access and try again.';
        if (error.code === 2) errorMessage = 'Location unavailable. Please check your connection.';
        if (error.code === 3) errorMessage = 'Location request timed out. Please try again.';
        
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Manual refresh function
  const refreshWeather = () => {
    if (location.lat && location.lon && !isRefreshing) {
      setIsRefreshing(true);
      sendToN8n(location.lat, location.lon);
    }
  };

  // Send coordinates to n8n webhook
  const sendToN8n = async (lat, lon) => {
    const WEBHOOK_URL = 'http://192.168.100.75:5678/webhook/e84f1485-b02b-43ab-a813-68e6f3328fb5';

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Weather service unavailable (${response.status})`);
      }

      const weatherData = await response.json();
      
      // Handle both array and object responses
      const weatherObj = Array.isArray(weatherData) ? weatherData[0] : weatherData;
      setWeather(weatherObj);
      setLastUpdate(new Date());
      setLoading(false);
      setIsRefreshing(false);
      setError('');

      // Send notification about weather update
      if (weatherObj?.weather?.[0]) {
        const temp = Math.round(weatherObj.main.temp);
        const desc = weatherObj.weather[0].description;
        sendNotification(
          `${weatherObj.name} • ${temp}°C`,
          `${desc.charAt(0).toUpperCase() + desc.slice(1)}`,
          getWeatherIcon(weatherObj.weather[0].main)
        );
      }

    } catch (error) {
      setError(error.message);
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Enhanced weather icons
  const getWeatherIcon = (weatherMain) => {
    const icons = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Fog': '🌫️',
      'Haze': '🌫️',
    };
    return icons[weatherMain] || '🌤️';
  };

  // Format time helper
  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return '';
    const minutes = Math.floor((new Date() - lastUpdate) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (location.lat && location.lon) {
      const interval = setInterval(() => {
        sendToN8n(location.lat, location.lon);
      }, 10 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [location]);

  // Get dynamic background based on weather
  const getWeatherGradient = () => {
    if (!weather?.weather?.[0]) {
      return 'from-blue-400 via-blue-500 to-blue-600';
    }
    
    const condition = weather.weather[0].main;
    const isNight = weather.dt < weather.sys.sunrise || weather.dt > weather.sys.sunset;
    
    if (isNight) {
      return 'from-indigo-900 via-purple-900 to-blue-900';
    }
    
    switch (condition) {
      case 'Clear':
        return 'from-orange-400 via-yellow-400 to-blue-400';
      case 'Rain':
      case 'Drizzle':
        return 'from-gray-600 via-gray-700 to-blue-800';
      case 'Thunderstorm':
        return 'from-gray-800 via-gray-900 to-purple-900';
      case 'Clouds':
        return 'from-gray-400 via-blue-500 to-blue-600';
      case 'Snow':
        return 'from-gray-100 via-blue-200 to-blue-400';
      default:
        return 'from-blue-400 via-blue-500 to-blue-600';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getWeatherGradient()} transition-all duration-1000`}>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          
          {/* Enhanced Header with notifications toggle */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Weather</h1>
              <p className="text-white/70 text-sm">Live updates • {getTimeSinceUpdate()}</p>
            </div>
            <div className="flex items-center space-x-3">
              {weather && (
                <button
                  onClick={refreshWeather}
                  disabled={isRefreshing}
                  className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200 disabled:opacity-50"
                >
                  <RefreshCw className={`h-5 w-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                onClick={requestNotificationPermission}
                className={`p-3 rounded-full transition-all duration-200 ${
                  notificationsEnabled
                    ? 'bg-green-500/80 hover:bg-green-500'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {notificationsEnabled ? (
                  <Bell className="h-5 w-5 text-white" />
                ) : (
                  <BellOff className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Main Weather Card */}
          {weather && weather.weather && weather.weather[0] ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-6 shadow-2xl border border-white/20">
              <div className="text-center mb-8">
                <div className="text-8xl mb-4 animate-pulse">
                  {getWeatherIcon(weather.weather[0].main)}
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {weather.name}
                </h2>
                <p className="text-white/70 text-sm mb-4">
                  {weather.sys?.country}
                </p>
                <div className="text-6xl font-light text-white mb-2">
                  {Math.round(weather.main.temp)}°
                </div>
                <p className="text-white/90 text-lg capitalize font-medium">
                  {weather.weather[0].description}
                </p>
                <p className="text-white/60 text-sm mt-2">
                  Feels like {Math.round(weather.main.feels_like)}°C
                </p>
              </div>
              
              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <Wind className="h-5 w-5 text-white/70" />
                    <div>
                      <p className="text-white/60 text-xs uppercase tracking-wider">Wind</p>
                      <p className="text-white font-bold text-lg">
                        {weather.wind?.speed || 0} m/s
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <Droplets className="h-5 w-5 text-white/70" />
                    <div>
                      <p className="text-white/60 text-xs uppercase tracking-wider">Humidity</p>
                      <p className="text-white font-bold text-lg">{weather.main.humidity}%</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <Gauge className="h-5 w-5 text-white/70" />
                    <div>
                      <p className="text-white/60 text-xs uppercase tracking-wider">Pressure</p>
                      <p className="text-white font-bold text-lg">{weather.main.pressure}</p>
                      <p className="text-white/50 text-xs">hPa</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <Eye className="h-5 w-5 text-white/70" />
                    <div>
                      <p className="text-white/60 text-xs uppercase tracking-wider">Visibility</p>
                      <p className="text-white font-bold text-lg">
                        {weather.visibility ? (weather.visibility / 1000).toFixed(1) : 'N/A'}
                      </p>
                      <p className="text-white/50 text-xs">km</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sun times and additional info */}
              <div className="flex justify-between items-center pt-6 border-t border-white/20">
                <div className="flex items-center space-x-2">
                  <Sunrise className="h-4 w-4 text-white/70" />
                  <div>
                    <p className="text-white/50 text-xs">Sunrise</p>
                    <p className="text-white text-sm font-medium">
                      {formatTime(weather.sys.sunrise)}
                    </p>
                  </div>
                </div>
                
                {weather.rain?.['1h'] && (
                  <div className="flex items-center space-x-2">
                    <CloudRain className="h-4 w-4 text-white/70" />
                    <div>
                      <p className="text-white/50 text-xs">Rain (1h)</p>
                      <p className="text-white text-sm font-medium">{weather.rain['1h']} mm</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Sunset className="h-4 w-4 text-white/70" />
                  <div>
                    <p className="text-white/50 text-xs">Sunset</p>
                    <p className="text-white text-sm font-medium">
                      {formatTime(weather.sys.sunset)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Get Weather CTA */
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-6 text-center shadow-2xl border border-white/20">
              <div className="text-6xl mb-6">🌤️</div>
              <h2 className="text-2xl font-bold text-white mb-4">Get Your Weather</h2>
              <p className="text-white/70 mb-8">
                Enable location access to see real-time weather updates with push notifications
              </p>
              
              <button
                onClick={getCurrentLocation}
                disabled={loading}
                className="w-full bg-white text-blue-600 font-bold py-4 px-6 rounded-2xl hover:bg-blue-50 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Getting your location...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-6 w-6" />
                    <span>Get Weather Updates</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Enhanced Error Message */}
          {error && (
            <div className="bg-red-500/20 backdrop-blur-lg border border-red-300/50 rounded-2xl p-6 mb-6 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <p className="text-red-100 font-medium">{error}</p>
                  {error.includes('denied') && (
                    <p className="text-red-200/80 text-sm mt-2">
                      Click the location icon in your browser's address bar to allow access
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Minimal Location Info */}
          {location.lat && location.lon && !weather && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-center shadow-xl border border-white/20">
              <p className="text-white/70 text-sm">
                📍 {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherPushApp;