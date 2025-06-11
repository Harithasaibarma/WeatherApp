const apiKey = "623fff4376e2107108832db038238f8a";
let hourlyChart;

function toggleDarkMode() {
  document.body.classList.toggle('dark');
}

function displayMessage(msg) {
  document.getElementById('weatherResult').innerHTML = `<p>${msg}</p>`;
  document.getElementById('forecastResult').innerHTML = '';
  hideHourlyChart();
}

function hideHourlyChart() {
  document.getElementById('hourlyChart').style.display = 'none';
}

function unixToTime(unix_timestamp, timezoneOffset = 0) {
  // Convert unix timestamp + timezone offset to readable time string HH:MM AM/PM
  const date = new Date((unix_timestamp + timezoneOffset) * 1000);
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // convert 0 to 12 for 12AM
  return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

async function getWeather() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return displayMessage('Please enter a city name.');

  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
    const data = await res.json();
    if (data.cod !== 200) throw new Error(data.message);

    const icon = data.weather[0].icon;
    const timezone = data.timezone;
    const sunrise = unixToTime(data.sys.sunrise, timezone);
    const sunset = unixToTime(data.sys.sunset, timezone);

    document.getElementById('weatherResult').innerHTML = `
      <h2>${data.name}, ${data.sys.country}</h2>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="Weather icon">
      <p><strong>${data.weather[0].description}</strong></p>
      <p>Temp: ${data.main.temp}°C (Feels like: ${data.main.feels_like}°C)</p>
      <p>Humidity: ${data.main.humidity}% | Wind: ${data.wind.speed} m/s</p>
      <p>Sunrise: ${sunrise} | Sunset: ${sunset}</p>
    `;
    hideHourlyChart();
    await showHourlyForecast(data.coord.lat, data.coord.lon);
  } catch (err) {
    displayMessage(`Error: ${err.message}`);
  }
}

async function showHourlyForecast(lat, lon) {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
    const data = await res.json();

    const next8 = data.list.slice(0, 8);
    const labels = next8.map(item => item.dt_txt.split(' ')[1].slice(0, 5));
    const temps = next8.map(item => item.main.temp);

    configureChart(labels, temps);
  } catch (err) {
    console.error(err);
  }
}

function configureChart(labels, dataArr) {
  const ctx = document.getElementById('hourlyChart').getContext('2d');
  if (!hourlyChart) {
    hourlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Hourly Temp (°C)',
          data: dataArr,
          borderColor: 'orange',
          fill: true
        }]
      },
      options: { responsive: true }
    });
  } else {
    hourlyChart.data.labels = labels;
    hourlyChart.data.datasets[0].data = dataArr;
    hourlyChart.update();
  }
  document.getElementById('hourlyChart').style.display = 'block';
}

async function getForecastByCity() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return displayMessage('Please enter a city name.');

  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
    const data = await res.json();
    if (data.cod !== "200") throw new Error(data.message);

    let html = `<h2>5-Day Forecast for ${data.city.name}</h2>`;
    const daily = data.list.filter(i => i.dt_txt.includes('12:00:00'));
    daily.forEach(item => {
      const icon = item.weather[0].icon;
      html += `
        <div class="forecast-item">
          <p><strong>${new Date(item.dt_txt).toDateString()}</strong></p>
          <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="Weather icon">
          <p>${item.main.temp}°C | ${item.weather[0].description}</p>
          <p>Humidity: ${item.main.humidity}%</p>
        </div>`;
    });
    document.getElementById('forecastResult').innerHTML = html;
    hideHourlyChart();
  } catch (err) {
    displayMessage(`Error: ${err.message}`);
  }
}

function getLocationWeather() {
  if (!navigator.geolocation) return displayMessage('Geolocation not supported.');
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('cityInput').value = '';
    const { latitude: lat, longitude: lon } = pos.coords;
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`)
      .then(r => r.json())
      .then(data => {
        if (data.cod !== 200) throw new Error(data.message);
        const icon = data.weather[0].icon;
        const timezone = data.timezone;
        const sunrise = unixToTime(data.sys.sunrise, timezone);
        const sunset = unixToTime(data.sys.sunset, timezone);

        document.getElementById('weatherResult').innerHTML = `
          <h2>${data.name}, ${data.sys.country}</h2>
          <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="Weather icon">
          <p><strong>${data.weather[0].description}</strong></p>
          <p>Temp: ${data.main.temp}°C (Feels like: ${data.main.feels_like}°C)</p>
          <p>Humidity: ${data.main.humidity}% | Wind: ${data.wind.speed} m/s</p>
          <p>Sunrise: ${sunrise} | Sunset: ${sunset}</p>
        `;
        hideHourlyChart();
        return showHourlyForecast(lat, lon);
      })
      .catch(err => displayMessage(`Error: ${err.message}`));
  }, err => displayMessage(`Error: ${err.message}`));
}

// --- Voice Command ---

function startVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert("Sorry, your browser doesn't support speech recognition.");
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = function(event) {
    const spokenText = event.results[0][0].transcript;
    document.getElementById('cityInput').value = spokenText;
    getWeather();
  };

  recognition.onerror = function(event) {
    alert('Speech recognition error: ' + event.error);
  };
}
