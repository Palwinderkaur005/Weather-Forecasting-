const userlocation = document.getElementById("userlocation"),
    converter = document.getElementById("converter"),
    weatherIcon = document.querySelector(".weatherIcon"),
    temperature = document.querySelector(".temperature"),
    feelslike = document.querySelector(".feelslike"),
    description = document.querySelector(".description"),
    date = document.querySelector(".date"),
    city = document.querySelector(".city"),
    HValue = document.getElementById("HValue"),
    WValue = document.getElementById("WValue"),
    SRValue = document.getElementById("SRValue"),
    SSValue = document.getElementById("SSValue"),
    CValue = document.getElementById("CValue"),
    PValue = document.getElementById("PValue"),
    Forecast = document.querySelector(".Forecast"),
    themeToggle = document.getElementById("themeToggle"),
    favoriteLocationsList = document.getElementById("favoriteLocationsList"),
    saveLocationBtn = document.getElementById("saveLocationBtn");  // Button to save location

const API_KEY = "a25ea4f4548971510fb8d34df7f67587";
const WEATHER_API_ENDPOINT = `https://api.openweathermap.org/data/2.5/weather?appid=${API_KEY}&units=metric&q=`;
const FORECAST_API_ENDPOINT = `https://api.openweathermap.org/data/2.5/forecast?appid=${API_KEY}&units=metric&q=`;

// Firebase setup for Push Notifications
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
            console.log('Service Worker Registered', registration);
        })
        .catch(error => {
            console.error('Service Worker Registration Failed', error);
        });
}

// Request Notification Permission
function requestNotificationPermission() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                subscribeToPushNotifications();
            } else {
                console.log('Notification permission denied.');
            }
        });
    }
}

// Subscribe to Push Notifications
function subscribeToPushNotifications() {
    messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY' })
        .then((currentToken) => {
            if (currentToken) {
                console.log("Device token: " + currentToken);
                // You can send this token to your server for future push notifications
            } else {
                console.log('No Instance ID token available. Request permission to generate one.');
            }
        })
        .catch((err) => {
            console.log('An error occurred while retrieving token. ', err);
        });
}

// Save favorite location to localStorage
function saveFavoriteLocation(cityName) {
    let favorites = JSON.parse(localStorage.getItem("favoriteLocations")) || [];
    if (!favorites.includes(cityName)) {
        favorites.push(cityName);
        localStorage.setItem("favoriteLocations", JSON.stringify(favorites));
        displayFavoriteLocations();
    }
}

// Display favorite locations in the UI
function displayFavoriteLocations() {
    let favorites = JSON.parse(localStorage.getItem("favoriteLocations")) || [];
    favoriteLocationsList.innerHTML = "";
    favorites.forEach(cityName => {
        let li = document.createElement("li");
        li.innerHTML = cityName;
        li.addEventListener("click", () => {
            userlocation.value = cityName;
            findUserLocation();
        });
        favoriteLocationsList.appendChild(li);
    });
}

// Check if the selected location is a favorite
function checkIfFavorite(cityName) {
    let favorites = JSON.parse(localStorage.getItem("favoriteLocations")) || [];
    return favorites.includes(cityName);
}

// Save location when save button is clicked
saveLocationBtn.addEventListener("click", () => {
    let cityName = userlocation.value.trim();
    if (cityName && !checkIfFavorite(cityName)) {
        saveFavoriteLocation(cityName);
    } else {
        alert("This location is already in your favorites.");
    }
});

// Function to find user location based on input
function findUserLocation() {
    Forecast.innerHTML = "";
    fetch(WEATHER_API_ENDPOINT + userlocation.value)
        .then((response) => response.json())
        .then((data) => {
            if (data.cod !== 200) {
                alert(data.message);
                return;
            }
            console.log("Weather API Response:", data);
            city.innerHTML = data.name + ", " + data.sys.country;
            weatherIcon.style.background = `url("https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png")`; 
            weatherIcon.style.backgroundSize = "contain";
            temperature.innerHTML = TemConverter(data.main.temp);
            feelslike.innerHTML = "Feels like " + TemConverter(data.main.feels_like);
            description.innerHTML = `<i class="fa-solid fa-cloud"></i> &nbsp; ${data.weather[0].description}`;
            const options = { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "numeric", hour12: true };
            date.innerHTML = getLongFormatDateTime(Date.now() / 1000, data.timezone, options);
            HValue.innerHTML = Math.round(data.main.humidity) + "<span>%</span>";
            WValue.innerHTML = Math.round(data.wind.speed) + "<span> km/h</span>";
            CValue.innerHTML = Math.round(data.clouds.all) + "<span>%</span>";
            PValue.innerHTML = Math.round(data.main.pressure) + "<span>hPa</span>";
            const timeOptions = { hour: "numeric", minute: "numeric", hour12: true };
            SRValue.innerHTML = getLongFormatDateTime(data.sys.sunrise, data.timezone, timeOptions);
            SSValue.innerHTML = getLongFormatDateTime(data.sys.sunset, data.timezone, timeOptions);

            // Send a notification if the weather condition is noteworthy
            if (data.weather[0].main === "Rain" || data.weather[0].main === "Thunderstorm") {
                showWeatherNotification(`Weather Alert: ${data.weather[0].main} in ${data.name}`);
            }

            // Auto-switch theme based on sunrise/sunset
            autoToggleTheme(data.sys.sunrise, data.sys.sunset, data.timezone);

            fetch(FORECAST_API_ENDPOINT + userlocation.value)
                .then((response) => response.json())
                .then((forecastData) => {
                    console.log("Forecast API Response:", forecastData);
                    forecastData.list.forEach((weather, index) => {
                        if (index % 8 === 0) {
                            let div = document.createElement("div");
                            const dateOptions = { weekday: "long", month: "long", day: "numeric" };
                            let daily = getLongFormatDateTime(weather.dt, data.timezone, dateOptions).split(" at ");
                            div.innerHTML = daily[0];
                            div.innerHTML += `<img src="https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png" />`;
                            div.innerHTML += `<p class="forecast-desc">${weather.weather[0].description}</p>`;
                            div.innerHTML += `<span><span>${TemConverter(weather.main.temp)}</span></span>`;
                            Forecast.append(div);
                        }
                    });
                });
        });
}

// Detect location using browser's geolocation API
function detectLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`)
                    .then(response => response.json())
                    .then(data => {
                        userlocation.value = data.name;
                        findUserLocation();
                    });
            },
            error => {
                alert("Unable to fetch location. Please enter your city manually.");
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// Show weather notification
function showWeatherNotification(message) {
    if (Notification.permission === 'granted') {
        new Notification(message);
    }
}



// Auto Theme Toggle (Based on Sunrise & Sunset)
function autoToggleTheme(sunrise, sunset, timezoneOffset) {
    const currentTime = Math.floor(Date.now() / 1000) + timezoneOffset;
    let isDaytime = currentTime >= sunrise && currentTime <= sunset;
    
    if (!localStorage.getItem("userTheme")) { // Only auto-switch if user hasn't manually set a theme
        setTheme(isDaytime ? "light" : "dark");
    }
}

// Manual Theme Toggle (Button Click)
themeToggle.addEventListener("click", () => {
    let currentTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    setTheme(currentTheme, true); // User manually changed theme
});

// Set the theme based on mode (light or dark)
function setTheme(mode, isManual = false) {
    if (mode === "dark") {
        document.body.classList.remove("light-mode");
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");
    }
    
    if (isManual) {
        localStorage.setItem("userTheme", mode); // Save user preference manually
    } else {
        localStorage.removeItem("userTheme"); // Remove manual setting to allow auto-switch
    }
}

// Apply saved theme on page load
function applySavedTheme() {
    let savedTheme = localStorage.getItem("userTheme");
    if (savedTheme) {
        setTheme(savedTheme, true);
    }
}

// Call on page load
document.addEventListener("DOMContentLoaded", () => {
    applySavedTheme(); 
});


// Auto Theme Toggle (Based on Sunrise & Sunset)
function autoToggleTheme(sunrise, sunset, timezoneOffset) {
    const currentTime = Math.floor(Date.now() / 1000) + timezoneOffset;
    let isDaytime = currentTime >= sunrise && currentTime <= sunset;
    setTheme(isDaytime ? "light" : "dark");
}




// Format Unix Time to local time
function formatUnixTime(dtValue, timezoneOffset, options = {}) {
    const date = new Date((dtValue + timezoneOffset) * 1000);
    return date.toLocaleTimeString("en-US", { timeZone: "UTC", ...options });
}

function getLongFormatDateTime(dtValue, timezoneOffset, options) {
    return formatUnixTime(dtValue, timezoneOffset, options);
}

// Temperature conversion between Celsius and Fahrenheit
function TemConverter(temp) {
    let tempValue = Math.round(temp);
    let message = "";
    if (converter.value == "°C") {
        message = tempValue + "<span>°C</span>";
    } else {
        let ctof = (tempValue * 9) / 5 + 32;
        message = Math.round(ctof) + "<span>°F</span>";
    }
    return message;
}

// Event listener for feedback form submission
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("feedbackForm").addEventListener("submit", function (e) {
        e.preventDefault();

        const name = document.getElementById("name").value;
        const message = document.getElementById("message").value;

        fetch("http://localhost:3000/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, message }),
        })
        .then(response => response.text())
        .then(data => {
            alert(data);
            document.getElementById("feedbackForm").reset();
        })
        .catch(error => console.error("Error:", error));
    });

    // Load Feedback
    fetch("http://localhost:3000/feedback")
        .then(response => response.json())
        .then(data => {
            let feedbackList = document.getElementById("feedbackList");
            feedbackList.innerHTML = "";
            data.forEach(feedback => {
                feedbackList.innerHTML += `<p><strong>${feedback.name}:</strong> ${feedback.message}</p>`;
            });
        });
});

document.addEventListener("DOMContentLoaded", () => {
    detectLocation(); // Detect user's location on page load
    applySavedTheme(); // Apply stored theme preference
    displayFavoriteLocations(); // Display favorite locations on page load
});
document.addEventListener("DOMContentLoaded", function () {
    requestNotificationPermission();
});
// Background color change based on time with manual override
function updateBackgroundColor() {
    const hour = new Date().getHours();
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        document.body.style.backgroundColor = "#2C3E50"; // Ensure dark mode applies
        return;
    }
    
    let backgroundColor;
    if (hour >= 6 && hour < 12) {
        backgroundColor = "#FFFAE3"; // Morning - Light Yellow
    } else if (hour >= 12 && hour < 18) {
        backgroundColor = "#FFDAB9"; // Afternoon - Peach
    } else if (hour >= 18 && hour < 21) {
        backgroundColor = "#FFB6C1"; // Evening - Light Pink
    } else {
        backgroundColor = "#2C3E50"; // Night - Dark Blue
    }
    document.body.style.backgroundColor = backgroundColor;
}

document.addEventListener("DOMContentLoaded", updateBackgroundColor);

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        document.body.style.backgroundColor = "#2C3E50";
    } else {
        updateBackgroundColor();
    }
});

// Enhanced Notifications (More Weather Alerts)
function checkSevereWeather(data) {
    const severeConditions = ["Thunderstorm", "Tornado", "Extreme", "Snow", "Blizzard"];
    if (severeConditions.includes(data.weather[0].main)) {
        showWeatherNotification(`Severe Weather Alert: ${data.weather[0].main} in ${data.name}`);
    }
}

// Call checkSevereWeather inside findUserLocation
const originalFindUserLocation = findUserLocation;
findUserLocation = function () {
    originalFindUserLocation();
    fetch(WEATHER_API_ENDPOINT + userlocation.value)
        .then(response => response.json())
        .then(data => checkSevereWeather(data));
};

// Manual Theme Toggle with Local Storage
const manualThemeToggle = document.createElement("button");
manualThemeToggle.innerText = "Switch Theme";
manualThemeToggle.style.position = "fixed";
manualThemeToggle.style.bottom = "20px";
manualThemeToggle.style.right = "20px";
manualThemeToggle.style.padding = "10px 15px";
manualThemeToggle.style.background = "#333";
manualThemeToggle.style.color = "#fff";
manualThemeToggle.style.border = "none";
manualThemeToggle.style.borderRadius = "5px";
manualThemeToggle.style.cursor = "pointer";

document.body.appendChild(manualThemeToggle);

manualThemeToggle.addEventListener("click", () => {
    let isDarkMode = document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
        document.body.style.backgroundColor = "#2C3E50";
    } else {
        updateBackgroundColor(); // Reapply background based on time
    }
});

// Improved Feedback System - Show latest feedback dynamically
function loadLatestFeedback() {
    fetch("http://localhost:3000/feedback")
        .then(response => response.json())
        .then(data => {
            let feedbackList = document.getElementById("feedbackList");
            feedbackList.innerHTML = "<h3>Latest Feedback</h3>";
            data.slice(-5).reverse().forEach(feedback => { // Show last 5 feedbacks
                let p = document.createElement("p");
                p.innerHTML = `<strong>${feedback.name}:</strong> ${feedback.message}`;
                feedbackList.appendChild(p);
            });
        });
}

document.addEventListener("DOMContentLoaded", loadLatestFeedback);

