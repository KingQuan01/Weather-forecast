const API_KEY = config.API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Dark mode toggle functionality
const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    // Save preference to localStorage
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', isDark ? 'dark' : 'light');
});

// Check for saved dark mode preference
document.addEventListener('DOMContentLoaded', () => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'dark') {
        document.documentElement.classList.add('dark');
    }
    // ... rest of your DOMContentLoaded code ...
});

// Custom cursor functionality
const customCursor = document.createElement('div');
customCursor.classList.add('custom-cursor');
document.body.appendChild(customCursor);

const cursorDot = document.createElement('div');
cursorDot.classList.add('cursor-dot');
document.body.appendChild(cursorDot);

document.addEventListener('mousemove', (e) => {
    customCursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
    cursorDot.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`;
});

// Weather functionality
const searchForm = document.querySelector('.search-container');
const cityInput = document.getElementById('cityInput');
const selectedLocation = document.getElementById('selectedLocation');
const suggestionsList = document.createElement('ul');
suggestionsList.className = 'suggestions-list bg-white dark:bg-gray-800 shadow-lg rounded-lg mt-1';
searchForm.appendChild(suggestionsList);

cityInput.addEventListener('input', async (e) => {
    const searchText = e.target.value.trim();
    if (searchText.length < 3) {
        suggestionsList.innerHTML = '';
        return;
    }

    const cities = await searchCities(searchText);
    suggestionsList.innerHTML = '';
    
    cities.forEach(city => {
        const li = document.createElement('li');
        li.className = 'px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer';
        
        const displayString = [
            city.name,
            city.state,
            city.country
        ].filter(Boolean).join(', ');
        
        li.textContent = displayString;
        
        li.addEventListener('click', () => {
            cityInput.value = displayString;
            selectedLocation.textContent = displayString;
            suggestionsList.innerHTML = '';
            fetchWeatherDataByCoords(city.lat, city.lon);
        });
        
        suggestionsList.appendChild(li);
    });
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) {
        suggestionsList.innerHTML = '';
    }
});

async function searchCities(searchText) {
    try {
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching cities:', error);
        return [];
    }
}

let map;
let marker;

function initMap() {
    map = L.map('mapContainer').setView([51.5074, -0.1278], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);

    // Initialize marker but don't set position yet
    marker = L.marker([51.5074, -0.1278]).addTo(map);
}

async function fetchWeatherDataByCoords(lat, lon) {
    try {
        // Get location name if not already set
        if (!cityInput.value) {
            const locationInfo = await getLocationName(lat, lon);
            if (locationInfo) {
                const displayName = [
                    locationInfo.city,
                    locationInfo.state,
                    locationInfo.country
                ].filter(Boolean).join(', ');
                
                selectedLocation.textContent = displayName;
                cityInput.value = displayName;
            }
        }

        const currentWeatherResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        if (!currentWeatherResponse.ok) throw new Error('Weather data not found');
        const currentWeatherData = await currentWeatherResponse.json();

        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        if (!forecastResponse.ok) throw new Error('Forecast data not found');
        const forecastData = await forecastResponse.json();

        // Update map position
        if (map) {
            map.setView([lat, lon], 10);
            marker.setLatLng([lat, lon]);
            
            // Add a popup to the marker with location name
            const popupContent = selectedLocation.textContent || 'Selected Location';
            marker.bindPopup(popupContent).openPopup();
        }

        updateWeatherDisplay(currentWeatherData);
        updateTimeSlider(forecastData);
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Failed to fetch weather data');
    }
}

function updateWeatherDisplay(data) {
    try {
        // Update temperature and feels like
        const tempElement = document.getElementById('temperature');
        const feelsLikeElement = document.getElementById('feelsLike');
        if (tempElement && feelsLikeElement) {
            tempElement.textContent = `${Math.round(data.main.temp)}°C`;
            feelsLikeElement.textContent = `${Math.round(data.main.feels_like)}°C`;
        }

        // Update weather icon
        const weatherIconElement = document.getElementById('weatherIcon');
        if (weatherIconElement && data.weather && data.weather[0]) {
            weatherIconElement.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            weatherIconElement.alt = data.weather[0].description;
        }

        // Update weather details
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };

        // Update each weather detail with proper formatting
        if (data.main) {
            updateElement('humidity', `${data.main.humidity}%`);
            updateElement('pressure', `${data.main.pressure} hPa`);
        }

        if (data.wind) {
            updateElement('wind', `${(data.wind.speed * 3.6).toFixed(1)} km/h`);
            updateElement('windDirection', `${data.wind.deg}°`);
        }

        if (data.clouds) {
            updateElement('clouds', `${data.clouds.all}%`);
        }

        // Update location name if available
        if (data.name) {
            const locationName = [data.name, data.sys?.country].filter(Boolean).join(', ');
            const selectedLocation = document.getElementById('selectedLocation');
            if (selectedLocation) {
                selectedLocation.textContent = locationName;
            }
        }

    } catch (error) {
        console.error('Error updating weather display:', error);
    }
}

function updateTimeSlider(forecastData) {
    const timeSlider = document.getElementById('timeSlider');
    if (!timeSlider) return;

    timeSlider.innerHTML = `
        <table class="w-full text-sm">
            <thead>
                <tr class="text-left">
                    <th class="p-2 font-semibold">Time</th>
                    <th class="p-2 font-semibold">Weather</th>
                    <th class="p-2 font-semibold">Temp (°C)</th>
                    <th class="p-2 font-semibold">Humidity</th>
                    <th class="p-2 font-semibold">Wind</th>
                    <th class="p-2 font-semibold">Clouds</th>
                </tr>
            </thead>
            <tbody>
    `;

    forecastData.list.slice(0, 8).forEach(forecast => {
        const time = new Date(forecast.dt * 1000);
        const hour = time.getHours().toString().padStart(2, '0');
        
        const row = `
            <tr class="text-center hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <td class="p-2">${hour}:00</td>
                <td class="p-2">
                    <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" 
                         alt="${forecast.weather[0].description}" 
                         class="w-8 h-8 mx-auto">
                </td>
                <td class="p-2">${Math.round(forecast.main.temp)}°C</td>
                <td class="p-2">${forecast.main.humidity}%</td>
                <td class="p-2">${Math.round(forecast.wind.speed * 3.6)} km/h</td>
                <td class="p-2">${forecast.clouds.all}%</td>
            </tr>
        `;
        
        timeSlider.querySelector('tbody').insertAdjacentHTML('beforeend', row);
    });

    timeSlider.innerHTML += '</tbody></table>';

    // Add click handlers for each row
    timeSlider.querySelectorAll('tbody tr').forEach((row, index) => {
        row.addEventListener('click', () => {
            updateWeatherDisplay(forecastData.list[index]);
        });
    });
}

// Add this function to get location name from coordinates
async function getLocationName(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        );
        if (!response.ok) throw new Error('Location not found');
        const data = await response.json();
        if (data.length > 0) {
            const location = data[0];
            return {
                city: location.name,
                state: location.state,
                country: location.country
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting location name:', error);
        return null;
    }
}

// Update the map click handler
async function onMapClick(e) {
    const { lat, lng } = e.latlng;
    const locationInfo = await getLocationName(lat, lng);
    if (locationInfo) {
        const displayName = [
            locationInfo.city,
            locationInfo.state,
            locationInfo.country
        ].filter(Boolean).join(', ');
        
        selectedLocation.textContent = displayName;
        cityInput.value = displayName;
    }
    fetchWeatherDataByCoords(lat, lng);
}

// Initialize everything after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    map.on('click', onMapClick);
    // Initial weather fetch for London
    fetchWeatherDataByCoords(51.5074, -0.1278);
});