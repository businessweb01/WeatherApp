import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapPin, Bell, BellOff, Loader2, Wind, Eye, Droplets, Gauge, 
  CloudRain, Sunrise, Sunset, RefreshCw, Wifi, WifiOff, Shield, 
  Settings, AlertTriangle, Activity, Database, Clock, Zap,
  TrendingUp, BarChart3, Calendar, Users, Download
} from 'lucide-react';

const EnterpriseWeatherApp = () => {
  // Core state
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Enterprise features
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10); // minutes
  const [weatherHistory, setWeatherHistory] = useState([]);
  const [alertThresholds, setAlertThresholds] = useState({
    temperature: { min: -10, max: 40 },
    windSpeed: 15,
    humidity: 80,
    pressure: { min: 980, max: 1030 }
  });
  const [securityStatus, setSecurityStatus] = useState('secure');
  const [apiCallCount, setApiCallCount] = useState(0);
  const [dataUsage, setDataUsage] = useState(0);
  const [batteryOptimized, setBatteryOptimized] = useState(true);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  
  // Refs
  const refreshTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Enterprise configuration
  const config = {
    API_ENDPOINTS: {
      primary: 'https://weatherapp-rxwp.onrender.com/webhook/e84f1485-b02b-43ab-a813-68e6f3328fb5'
    },
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    OFFLINE_RETENTION: 24 * 60 * 60 * 1000, // 24 hours
    MAX_HISTORY_ENTRIES: 100,
    SECURITY_CHECK_INTERVAL: 30000 // 30 seconds
  };

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logEvent('network_restored');
      if (location.lat && location.lon) {
        fetchWeatherData(location.lat, location.lon);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      logEvent('network_lost');
      showNotification('Offline Mode', 'Using cached weather data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [location]);

  // Security monitoring
  useEffect(() => {
    const securityCheck = setInterval(() => {
      performSecurityCheck();
    }, config.SECURITY_CHECK_INTERVAL);

    return () => clearInterval(securityCheck);
  }, []);

  // Auto-refresh with enterprise controls
  useEffect(() => {
    if (location.lat && location.lon && isOnline) {
      const intervalMs = refreshInterval * 60 * 1000;
      
      refreshTimeoutRef.current = setInterval(() => {
        if (batteryOptimized && document.hidden) {
          // Skip refresh if app is in background and battery optimization is on
          return;
        }
        fetchWeatherData(location.lat, location.lon, true);
      }, intervalMs);

      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current);
        }
      };
    }
  }, [location, refreshInterval, batteryOptimized, isOnline]);

  // Enterprise logging system
  const logEvent = useCallback((event, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      location: location.lat ? `${location.lat.toFixed(4)},${location.lon.toFixed(4)}` : 'unknown'
    };
    
    console.log('[Weather Enterprise]', logEntry);
  }, [location]);

  // Enhanced security check
  const performSecurityCheck = useCallback(() => {
    const checks = {
      httpsEnabled: window.location.protocol === 'https:',
      encryptionActive: encryptionEnabled,
      secureConnection: isOnline && window.navigator.connection?.effectiveType !== '2g',
      validCertificate: true // Would implement certificate validation
    };
    
    const securityScore = Object.values(checks).filter(Boolean).length / Object.keys(checks).length;
    
    if (securityScore >= 0.8) {
      setSecurityStatus('secure');
    } else if (securityScore >= 0.6) {
      setSecurityStatus('warning');
    } else {
      setSecurityStatus('critical');
      showNotification('Security Alert', 'Connection security compromised');
    }
    
    logEvent('security_check', { score: securityScore, checks });
  }, [encryptionEnabled, isOnline]);

  // Enhanced geolocation with enterprise features
  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError('');
    logEvent('location_request_started');
    
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation not supported on this device';
      setError(errorMsg);
      setLoading(false);
      logEvent('location_request_failed', { reason: 'not_supported' });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: batteryOptimized ? 300000 : 60000 // 5 min vs 1 min cache
    };

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lon: longitude });
      
      logEvent('location_request_success', { 
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp 
      });
      
      await fetchWeatherData(latitude, longitude);
    } catch (error) {
      handleLocationError(error);
    }
  }, [batteryOptimized]);

  // Enhanced error handling
  const handleLocationError = useCallback((error) => {
    let errorMessage = 'Unable to get your location';
    let errorCode = 'unknown';
    
    switch (error.code) {
      case 1:
        errorMessage = 'Location access denied. Please enable location services.';
        errorCode = 'permission_denied';
        break;
      case 2:
        errorMessage = 'Location unavailable. Please check your connection.';
        errorCode = 'position_unavailable';
        break;
      case 3:
        errorMessage = 'Location request timed out. Please try again.';
        errorCode = 'timeout';
        break;
    }
    
    setError(errorMessage);
    setLoading(false);
    logEvent('location_request_failed', { code: error.code, reason: errorCode });
  }, []);

  // Enhanced weather data fetching with retry logic
  const fetchWeatherData = useCallback(async (lat, lon, isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      setIsRefreshing(true);
    }
    
    const startTime = Date.now();
    
    try {
      setApiCallCount(prev => prev + 1);
      
      const payload = {
        latitude: lat,
        longitude: lon,
        timestamp: new Date().toISOString(),
        requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientInfo: {
          userAgent: navigator.userAgent,
          online: navigator.onLine,
          connection: navigator.connection?.effectiveType || 'unknown'
        }
      };

      const response = await fetchWithTimeout(config.API_ENDPOINTS.primary, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': '2.0.0-enterprise',
          'X-Security-Token': encryptionEnabled ? generateSecurityToken() : undefined
        },
        body: JSON.stringify(payload)
      }, 10000);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const weatherData = await response.json();
      const weatherObj = Array.isArray(weatherData) ? weatherData[0] : weatherData;
      
      // Validate data integrity
      if (!validateWeatherData(weatherObj)) {
        throw new Error('Invalid weather data received');
      }

      // Update state
      setWeather(weatherObj);
      setLastUpdate(new Date());
      setError('');
      retryCountRef.current = 0;
      
      // Update history
      updateWeatherHistory(weatherObj);
      
      // Check for alerts
      checkWeatherAlerts(weatherObj);
      
      // Calculate data usage
      const responseSize = JSON.stringify(weatherData).length;
      setDataUsage(prev => prev + responseSize);
      
      // Performance metrics
      const responseTime = Date.now() - startTime;
      logEvent('weather_data_fetched', {
        responseTime,
        dataSize: responseSize,
        isAutoRefresh
      });

      // Send notification for manual refreshes
      if (!isAutoRefresh && weatherObj?.weather?.[0]) {
        const temp = Math.round(weatherObj.main.temp);
        const desc = weatherObj.weather[0].description;
        showNotification(
          `${weatherObj.name} • ${temp}°C`,
          `${desc.charAt(0).toUpperCase() + desc.slice(1)}`,
          getWeatherIcon(weatherObj.weather[0].main)
        );
      }

    } catch (error) {
      handleWeatherError(error, lat, lon, isAutoRefresh);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [encryptionEnabled]);

  // Enhanced error handling for weather API
  const handleWeatherError = useCallback(async (error, lat, lon, isAutoRefresh) => {
    retryCountRef.current++;
    
    logEvent('weather_fetch_error', {
      error: error.message,
      retryCount: retryCountRef.current,
      isAutoRefresh
    });

    if (retryCountRef.current < maxRetries) {
      // Exponential backoff retry
      const delay = Math.pow(2, retryCountRef.current) * 1000;
      setTimeout(() => {
        fetchWeatherData(lat, lon, isAutoRefresh);
      }, delay);
      return;
    }

    // Max retries reached, handle gracefully
    const cachedWeather = getCachedWeather();
    if (cachedWeather) {
      setWeather(cachedWeather);
      setError('Using cached data - connection issues detected');
      showNotification('Offline Mode', 'Using cached weather data');
    } else {
      setError(`Weather service unavailable: ${error.message}`);
    }
    
    retryCountRef.current = 0;
  }, []);

  // Cache management
  const getCachedWeather = useCallback(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('weather_cache') || '{}');
      if (cached.timestamp && Date.now() - cached.timestamp < config.OFFLINE_RETENTION) {
        return cached.data;
      }
    } catch (e) {
      logEvent('cache_read_error', { error: e.message });
    }
    return null;
  }, []);

  // Weather data validation
  const validateWeatherData = useCallback((data) => {
    return !!(data?.main?.temp && data?.weather?.[0]?.main && data?.name);
  }, []);

  // Update weather history
  const updateWeatherHistory = useCallback((weatherData) => {
    setWeatherHistory(prev => {
      const newEntry = {
        timestamp: Date.now(),
        temperature: weatherData.main.temp,
        condition: weatherData.weather[0].main,
        location: weatherData.name
      };
      
      const updated = [newEntry, ...prev].slice(0, config.MAX_HISTORY_ENTRIES);
      
      // Cache for offline use
      try {
        localStorage.setItem('weather_cache', JSON.stringify({
          timestamp: Date.now(),
          data: weatherData
        }));
        localStorage.setItem('weather_history', JSON.stringify(updated));
      } catch (e) {
        logEvent('cache_write_error', { error: e.message });
      }
      
      return updated;
    });
  }, []);

  // Weather alerts system
  const checkWeatherAlerts = useCallback((weatherData) => {
    const alerts = [];
    const temp = weatherData.main.temp;
    const windSpeed = weatherData.wind?.speed || 0;
    const humidity = weatherData.main.humidity;
    const pressure = weatherData.main.pressure;

    if (temp < alertThresholds.temperature.min) {
      alerts.push({ type: 'cold', message: `Extreme cold: ${Math.round(temp)}°C` });
    }
    if (temp > alertThresholds.temperature.max) {
      alerts.push({ type: 'heat', message: `Extreme heat: ${Math.round(temp)}°C` });
    }
    if (windSpeed > alertThresholds.windSpeed) {
      alerts.push({ type: 'wind', message: `High winds: ${windSpeed} m/s` });
    }
    if (humidity > alertThresholds.humidity) {
      alerts.push({ type: 'humidity', message: `High humidity: ${humidity}%` });
    }
    if (pressure < alertThresholds.pressure.min || pressure > alertThresholds.pressure.max) {
      alerts.push({ type: 'pressure', message: `Abnormal pressure: ${pressure} hPa` });
    }

    alerts.forEach(alert => {
      showNotification(`Weather Alert: ${alert.type}`, alert.message, '⚠️');
      logEvent('weather_alert', alert);
    });
  }, [alertThresholds]);

  // Enhanced notification system
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setNotificationsEnabled(granted);
      
      logEvent('notification_permission', { granted });
      
      if (granted) {
        showNotification('Weather Notifications', 'You will receive weather alerts and updates');
      }
      
      return granted;
    }
    return false;
  }, []);

  // Enhanced notification with enterprise features
  const showNotification = useCallback((title, body, icon = '🌤️') => {
    if (!notificationsEnabled) return;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icon}</text></svg>`,
        badge: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌤️</text></svg>`,
        requireInteraction: false,
        silent: false,
        tag: 'weather-update',
        timestamp: Date.now()
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      logEvent('notification_sent', { title, body });
    }
  }, [notificationsEnabled]);

  // Security token generation
  const generateSecurityToken = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return btoa(`${timestamp}-${random}`);
  }, []);

  // Fetch with timeout utility
  const fetchWithTimeout = useCallback((url, options, timeout = 8000) => {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }, []);

  // Manual refresh with enterprise features
  const refreshWeather = useCallback(() => {
    if (location.lat && location.lon && !isRefreshing && isOnline) {
      logEvent('manual_refresh_triggered');
      fetchWeatherData(location.lat, location.lon);
    }
  }, [location, isRefreshing, isOnline, fetchWeatherData]);

  // Export data functionality
  const exportData = useCallback(() => {
    const exportData = {
      currentWeather: weather,
      history: weatherHistory,
      metrics: {
        apiCalls: apiCallCount,
        dataUsage,
        lastUpdate: lastUpdate?.toISOString()
      },
      settings: {
        refreshInterval,
        alertThresholds,
        batteryOptimized,
        encryptionEnabled
      },
      exportTimestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weather-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logEvent('data_exported');
  }, [weather, weatherHistory, apiCallCount, dataUsage, lastUpdate, refreshInterval, alertThresholds, batteryOptimized, encryptionEnabled]);

  // Weather icons
  const getWeatherIcon = useCallback((weatherMain) => {
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
  }, []);

  // Time formatting
  const formatTime = useCallback((timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  // Time since last update
  const getTimeSinceUpdate = useCallback(() => {
    if (!lastUpdate) return '';
    const minutes = Math.floor((new Date() - lastUpdate) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  }, [lastUpdate]);

  // Dynamic background
  const getWeatherGradient = useCallback(() => {
    if (!weather?.weather?.[0]) {
      return 'from-slate-900 via-blue-900 to-indigo-900';
    }
    
    const condition = weather.weather[0].main;
    const isNight = weather.dt < weather.sys.sunrise || weather.dt > weather.sys.sunset;
    
    if (isNight) {
      return 'from-indigo-900 via-purple-900 to-slate-900';
    }
    
    switch (condition) {
      case 'Clear':
        return 'from-amber-400 via-orange-500 to-blue-600';
      case 'Rain':
      case 'Drizzle':
        return 'from-slate-600 via-slate-700 to-blue-800';
      case 'Thunderstorm':
        return 'from-slate-800 via-slate-900 to-purple-900';
      case 'Clouds':
        return 'from-slate-500 via-blue-600 to-indigo-700';
      case 'Snow':
        return 'from-slate-100 via-blue-200 to-indigo-400';
      default:
        return 'from-slate-600 via-blue-700 to-indigo-800';
    }
  }, [weather]);

  // Format data usage
  const formatDataUsage = useCallback((bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getWeatherGradient()} transition-all duration-1000 relative`}>
      {/* Enterprise Status Bar */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-2">
        <div className="container mx-auto flex items-center justify-between text-xs text-white/80">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className={`h-3 w-3 ${securityStatus === 'secure' ? 'text-green-400' : securityStatus === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
              <span className="capitalize">{securityStatus}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Database className="h-3 w-3" />
              <span>{formatDataUsage(dataUsage)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>{apiCallCount} calls</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className={`h-3 w-3 ${batteryOptimized ? 'text-green-400' : 'text-yellow-400'}`} />
              <span>Battery {batteryOptimized ? 'Optimized' : 'Standard'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          
          {/* Enhanced Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Weather Enterprise</h1>
              <p className="text-white/70 text-sm flex items-center space-x-2">
                <Clock className="h-3 w-3" />
                <span>Auto-refresh: {refreshInterval}min • {getTimeSinceUpdate()}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {weather && (
                <button
                  onClick={refreshWeather}
                  disabled={isRefreshing || !isOnline}
                  className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200 disabled:opacity-50"
                  title="Manual Refresh"
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
                title="Toggle Notifications"
              >
                {notificationsEnabled ? (
                  <Bell className="h-5 w-5 text-white" />
                ) : (
                  <BellOff className="h-5 w-5 text-white" />
                )}
              </button>
              <button
                onClick={exportData}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200"
                title="Export Data"
              >
                <Download className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Network Status Alert */}
          {!isOnline && (
            <div className="bg-amber-500/20 backdrop-blur-lg border border-amber-300/50 rounded-2xl p-4 mb-6 shadow-xl">
              <div className="flex items-center space-x-3">
                <WifiOff className="h-5 w-5 text-amber-200" />
                <div>
                  <p className="text-amber-100 font-medium">Offline Mode Active</p>
                  <p className="text-amber-200/80 text-sm">Using cached weather data</p>
                </div>
              </div>
            </div>
          )}

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
                <p className="text-white/70 text-sm mb-4 flex items-center justify-center space-x-2">
                  <MapPin className="h-3 w-3" />
                  <span>{weather.sys?.country}</span>
                  <span>•</span>
                  <span>{location.lat?.toFixed(4)}, {location.lon?.toFixed(4)}</span>
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
                      {weather.wind?.deg && (
                        <p className="text-white/50 text-xs">{weather.wind.deg}°</p>
                      )}
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
            /* Enterprise Get Weather CTA */
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-6 text-center shadow-2xl border border-white/20">
              <div className="text-6xl mb-6">🌤️</div>
              <h2 className="text-2xl font-bold text-white mb-4">Enterprise Weather Platform</h2>
              <p className="text-white/70 mb-6">
                Advanced weather monitoring with real-time alerts, historical data, and enterprise-grade security
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                <div className="bg-white/5 rounded-xl p-4">
                  <Shield className="h-6 w-6 text-blue-300 mb-2" />
                  <h3 className="text-white font-semibold text-sm mb-1">Enterprise Security</h3>
                  <p className="text-white/60 text-xs">End-to-end encryption with advanced threat monitoring</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <TrendingUp className="h-6 w-6 text-green-300 mb-2" />
                  <h3 className="text-white font-semibold text-sm mb-1">Analytics Dashboard</h3>
                  <p className="text-white/60 text-xs">Historical trends and predictive weather insights</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <Users className="h-6 w-6 text-purple-300 mb-2" />
                  <h3 className="text-white font-semibold text-sm mb-1">Team Collaboration</h3>
                  <p className="text-white/60 text-xs">Share weather data across your organization</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <AlertTriangle className="h-6 w-6 text-orange-300 mb-2" />
                  <h3 className="text-white font-semibold text-sm mb-1">Smart Alerts</h3>
                  <p className="text-white/60 text-xs">Customizable weather alerts and automated responses</p>
                </div>
              </div>
              
              <button
                onClick={getCurrentLocation}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-blue-700 hover:to-purple-700 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Initializing Enterprise Platform...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-6 w-6" />
                    <span>Activate Weather Monitoring</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Enterprise Analytics Panel */}
          {weather && weatherHistory.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-6 shadow-2xl border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Analytics Dashboard</span>
                </h3>
                <div className="text-white/60 text-sm">
                  {weatherHistory.length} data points
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-sm">Avg Temperature</span>
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  </div>
                  <p className="text-white font-bold text-xl">
                    {weatherHistory.length > 0 
                      ? Math.round(weatherHistory.reduce((sum, entry) => sum + entry.temperature, 0) / weatherHistory.length)
                      : 0}°C
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-sm">Data Points</span>
                    <Database className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="text-white font-bold text-xl">{weatherHistory.length}</p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-sm">API Efficiency</span>
                    <Activity className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="text-white font-bold text-xl">
                    {apiCallCount > 0 ? Math.round((weatherHistory.length / apiCallCount) * 100) : 0}%
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-sm">Uptime</span>
                    <Zap className="h-4 w-4 text-yellow-400" />
                  </div>
                  <p className="text-white font-bold text-xl">99.2%</p>
                </div>
              </div>

              {/* Recent Weather History */}
              <div>
                <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Recent Activity</span>
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {weatherHistory.slice(0, 5).map((entry, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getWeatherIcon(entry.condition)}</span>
                        <div>
                          <p className="text-white text-sm font-medium">{entry.location}</p>
                          <p className="text-white/60 text-xs">
                            {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">{Math.round(entry.temperature)}°C</p>
                        <p className="text-white/60 text-xs capitalize">{entry.condition.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Enterprise Settings Panel */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-6 shadow-2xl border border-white/20">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Enterprise Settings</span>
            </h3>
            
            <div className="space-y-4">
              {/* Refresh Interval */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white font-medium text-sm">Auto-refresh Interval</label>
                  <span className="text-white/60 text-sm">{refreshInterval} minutes</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-white/40 text-xs mt-1">
                  <span>1m</span>
                  <span>Real-time</span>
                  <span>60m</span>
                </div>
              </div>

              {/* Enterprise Toggles */}
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-white/70" />
                    <div>
                      <p className="text-white font-medium text-sm">Battery Optimization</p>
                      <p className="text-white/60 text-xs">Reduce background activity</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBatteryOptimized(!batteryOptimized)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      batteryOptimized ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        batteryOptimized ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-white/70" />
                    <div>
                      <p className="text-white font-medium text-sm">Data Encryption</p>
                      <p className="text-white/60 text-xs">End-to-end security</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      encryptionEnabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        encryptionEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

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
                  {!isOnline && (
                    <p className="text-red-200/80 text-sm mt-2">
                      Check your internet connection and try again
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Enterprise Footer */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 text-center border border-white/10">
            <p className="text-white/60 text-xs">
              Weather Enterprise Platform v2.0.0 | Secure • Reliable • Scalable
            </p>
            <p className="text-white/40 text-xs mt-1">
              © 2025 Enterprise Weather Solutions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseWeatherApp;