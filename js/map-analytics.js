/**
 * Kynos Raksha - GIS Mapping & Municipal Analytics Module
 * Renders interactive Leaflet maps with custom dog & rescue pins,
 * and Chart.js municipal population and health trends.
 */

class MapAnalyticsManager {
  constructor(stateManager) {
    this.state = stateManager;
    this.map = null;
    this.markerLayer = null;
    this.charts = {};
  }

  /**
   * Initialize Leaflet GIS Map
   */
  initMap(containerId = 'kynos-gis-map') {
    const el = document.getElementById(containerId);
    if (!el || !window.L) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Centered around Delhi
    this.map = L.map(containerId).setView([28.5650, 77.2150], 12);

    // OpenStreetMap tiles with dark/modern carto aesthetic
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.renderMarkers();
  }

  /**
   * Render dog & incident pins onto the map
   */
  renderMarkers(filter = 'all') {
    if (!this.markerLayer || !this.map) return;
    this.markerLayer.clearLayers();

    const dogs = this.state.getDogs();
    const reports = this.state.getReports();

    // Custom Marker Icons
    const createCustomIcon = (color, emoji) => {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="marker-pin ${color}"><span class="marker-icon">${emoji}</span></div>`,
        iconSize: [36, 42],
        iconAnchor: [18, 40],
        popupAnchor: [0, -38]
      });
    };

    // Plot dogs
    dogs.forEach(dog => {
      if (!dog.lat || !dog.lng) return;

      const isSterilized = dog.sterilization?.status === 'Sterilized';
      const isAdoptable = dog.adoption?.isAvailable;
      
      // Apply filters
      if (filter === 'sterilized' && !isSterilized) return;
      if (filter === 'unsterilized' && isSterilized) return;
      if (filter === 'adoptable' && !isAdoptable) return;

      const pinColor = isAdoptable ? 'pin-blue' : (isSterilized ? 'pin-green' : 'pin-yellow');
      const icon = createCustomIcon(pinColor, '🐕');

      const marker = L.marker([dog.lat, dog.lng], { icon }).addTo(this.markerLayer);

      const popupHtml = `
        <div class="map-popup-card">
          <img src="${dog.photo}" class="popup-dog-img" alt="${dog.name}">
          <div class="popup-dog-content">
            <h4>${dog.name} <span class="popup-id">${dog.id}</span></h4>
            <div class="popup-badges">
              <span class="popup-badge ${isSterilized ? 'badge-green' : 'badge-yellow'}">
                ${isSterilized ? 'Sterilized (ABC)' : 'Pending ABC'}
              </span>
              <span class="popup-badge badge-cyan">${dog.vaccination?.rabiesStatus || 'Rabies Active'}</span>
            </div>
            <p class="popup-territory">📍 ${dog.territory || dog.ward}</p>
            <button class="popup-view-btn" onclick="window.KynosApp.openDogProfile('${dog.id}')">
              View Digital Profile & QR →
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
    });

    // Plot SOS Emergency Reports
    if (filter === 'all' || filter === 'emergency') {
      reports.forEach(report => {
        if (!report.lat || !report.lng || report.status === 'Closed') return;

        const icon = createCustomIcon('pin-red pulse-pin', '🚨');
        const marker = L.marker([report.lat, report.lng], { icon }).addTo(this.markerLayer);

        const reportPopup = `
          <div class="map-popup-card emergency-popup">
            <div class="emergency-tag-header">🚨 ${report.incidentType} (${report.severity})</div>
            <p><strong>Location:</strong> ${report.locationDescription}</p>
            <p><strong>Status:</strong> <span class="badge-status-${report.status.toLowerCase().replace(/[\s/]/g, '')}">${report.status}</span></p>
            <p><strong>Reported:</strong> ${report.timestamp}</p>
            <button class="popup-view-btn danger-btn" onclick="window.KynosApp.switchTab('reports')">
              View Emergency Queue →
            </button>
          </div>
        `;

        marker.bindPopup(reportPopup);
      });
    }
  }

  /**
   * Render Chart.js Analytics Dashboard
   */
  renderAnalytics() {
    if (!window.Chart) return;

    const dogs = this.state.getDogs();
    const reports = this.state.getReports();

    // 1. Calculate KPI Numbers
    const totalDogs = dogs.length;
    const sterilizedCount = dogs.filter(d => d.sterilization?.status === 'Sterilized').length;
    const sterilizedPct = totalDogs > 0 ? Math.round((sterilizedCount / totalDogs) * 100) : 0;
    
    const rabiesVaccinatedCount = dogs.filter(d => d.vaccination?.rabiesStatus === 'Active').length;
    const rabiesPct = totalDogs > 0 ? Math.round((rabiesVaccinatedCount / totalDogs) * 100) : 0;

    const activeRescues = reports.filter(r => r.status === 'Reported' || r.status === 'Dispatched' || r.status === 'In Treatment').length;
    const adoptableCount = dogs.filter(d => d.adoption?.isAvailable).length;

    // Update KPI cards in DOM
    const setKpi = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setKpi('kpi-total-dogs', totalDogs);
    setKpi('kpi-sterilized-pct', `${sterilizedPct}%`);
    setKpi('kpi-rabies-pct', `${rabiesPct}%`);
    setKpi('kpi-active-rescues', activeRescues);
    setKpi('kpi-adoptable-dogs', adoptableCount);

    // 2. Chart 1: Sterilization & Vaccination Coverage by Ward
    const wardCanvas = document.getElementById('chart-ward-coverage');
    if (wardCanvas) {
      if (this.charts.wardChart) this.charts.wardChart.destroy();
      
      const wards = ["Ward 42 (South)", "Ward 38 (Central)", "Ward 12 (NDMC)", "Ward 40 (S-Central)", "Ward 45 (South)"];
      this.charts.wardChart = new Chart(wardCanvas, {
        type: 'bar',
        data: {
          labels: wards,
          datasets: [
            {
              label: 'Sterilized (ABC)',
              data: [88, 79, 92, 84, 75],
              backgroundColor: 'rgba(16, 185, 129, 0.85)',
              borderRadius: 6
            },
            {
              label: 'Rabies Vaccinated (ARV)',
              data: [94, 86, 96, 90, 82],
              backgroundColor: 'rgba(6, 182, 212, 0.85)',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#94a3b8' } }
          },
          scales: {
            y: {
              max: 100,
              ticks: { color: '#94a3b8', callback: v => v + '%' },
              grid: { color: 'rgba(255,255,255,0.05)' }
            },
            x: {
              ticks: { color: '#94a3b8' },
              grid: { display: false }
            }
          }
        }
      });
    }

    // 3. Chart 2: Rabies Herd Immunity Target (Target >= 70%)
    const rabiesCanvas = document.getElementById('chart-rabies-target');
    if (rabiesCanvas) {
      if (this.charts.rabiesChart) this.charts.rabiesChart.destroy();

      this.charts.rabiesChart = new Chart(rabiesCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Vaccinated (ARV Active)', 'Due for Booster', 'Unvaccinated'],
          datasets: [{
            data: [rabiesVaccinatedCount, dogs.filter(d => d.vaccination?.rabiesStatus === 'Due Soon').length, dogs.filter(d => !d.vaccination || d.vaccination.rabiesStatus === 'Overdue').length || 1],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8' } }
          },
          cutout: '70%'
        }
      });
    }
  }
}

window.KynosMapAnalytics = new MapAnalyticsManager(window.KynosState);
