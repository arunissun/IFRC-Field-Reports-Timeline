// Token will be fetched from Vercel serverless function
// This ensures the token is NEVER visible in the source code

let map; // Will be initialized after token is fetched

// Fetch token from serverless API and initialize map
async function initializeVisualization() {
    try {
        // Fetch token from Vercel serverless function
        const response = await fetch(CONFIG.TOKEN_API || '/api/get-token');
        if (!response.ok) {
            throw new Error('Failed to fetch Mapbox token');
        }
        
        const data = await response.json();
        const token = data.token;
        
        if (!token) {
            throw new Error('No token returned from API');
        }
        
        // Set Mapbox access token
        mapboxgl.accessToken = token;
        
        // Initialize the map
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/go-ifrc/ckrfe16ru4c8718phmckdfjh0',
            projection: 'globe',
            center: [20, 20],
            zoom: 2.2,
            pitch: 0
        });
        
        // Continue with map setup
        setupMap();
        
    } catch (error) {
        console.error('Error initializing visualization:', error);
        document.getElementById('map').innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white;">
                <div style="text-align: center;">
                    <h2>Failed to load visualization</h2>
                    <p>${error.message}</p>
                    <p style="font-size: 12px; opacity: 0.7;">Please check console for details</p>
                </div>
            </div>
        `;
    }
}

// Setup map after initialization
function setupMap() {

let monthlyData = [];
let currentMonthIndex = 0;
let isPlaying = false;
let animationInterval = null;
let speed = 1;
let currentMarkers = [];
let fadingMarkers = [];
let totalReportsCount = 0;

// Cumulative event counts
let cumulativeCounts = {
    covid: 0,
    ukraine: 0,
    flood: 0,
    cyclone: 0,
    earthquake: 0,
    epidemic: 0,
    drought: 0,
    civilUnrest: 0,
    others: 0
};

// Event colors
const eventColors = {
    'covid': '#ff4444',
    'ukraine': '#ff8800',
    'flood': '#2196F3',
    'cyclone': '#9C27B0',
    'earthquake': '#2600ffff',
    'epidemic': '#4CAF50',
    'drought': '#a4c422ff',
    'civilUnrest': '#795548',
    'others': '#607D8B'
};

map.on('style.load', () => {
    map.setFog({
        'range': [0.8, 8],
        'color': '#ffffff',
        'horizon-blend': 0.1,
        'high-color': '#245bde',
        'space-color': '#000000',
        'star-intensity': 0.2
    });

    // Add rings source
    map.addSource('rings', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': []
        }
    });

    map.addLayer({
        'id': 'ring-layer',
        'type': 'circle',
        'source': 'rings',
        'paint': {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'progress'],
                0, ['get', 'size'],
                1, ['*', ['get', 'size'], 3]
            ],
            'circle-color': ['get', 'color'],
            'circle-opacity': [
                'interpolate',
                ['linear'],
                ['get', 'progress'],
                0, 0.6,
                1, 0
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-opacity': [
                'interpolate',
                ['linear'],
                ['get', 'progress'],
                0, 0.8,
                1, 0
            ]
        }
    });
});

// Globe rotation
let userInteracting = false;
let userLng = 20;
let lastInteractionTime = 0;

function spinGlobe() {
    const timeSinceInteraction = Date.now() - lastInteractionTime;
    // Only spin if not interacting and enough time has passed since last interaction
    if (!userInteracting && isPlaying && timeSinceInteraction > 1000) {
        const center = map.getCenter();
        userLng = center.lng - 0.1;
        if (userLng < -180) userLng += 360;
        map.setCenter([userLng, center.lat]);
    }
}

map.on('load', () => {
    setInterval(spinGlobe, 40);
});

map.on('mousedown', () => { 
    userInteracting = true; 
    lastInteractionTime = Date.now();
});


map.on('mouseup', () => {
    userLng = map.getCenter().lng;
    lastInteractionTime = Date.now();
    setTimeout(() => { userInteracting = false; }, 1000);
});

// Add zoom interaction tracking
map.on('wheel', () => {
    lastInteractionTime = Date.now();
});

map.on('touchstart', () => {
    userInteracting = true;
    lastInteractionTime = Date.now();
});

map.on('touchend', () => {
    userLng = map.getCenter().lng;
    lastInteractionTime = Date.now();
    setTimeout(() => { userInteracting = false; }, 1000);
});

// Add zoom control tracking
map.on('zoom', () => {
    lastInteractionTime = Date.now();
});

map.on('drag', () => {
    lastInteractionTime = Date.now();
});

function getEventType(location) {
    // Check for COVID-19
    if (location.is_covid) {
        return 'covid';
    }
    
    // Check for Ukraine conflict
    const eventName = (location.event_name || '').toLowerCase();
    if (eventName.includes('ukraine')) {
        return 'ukraine';
    }
    
    // Check disaster type
    const dtypeName = (location.dtype_name || '').toLowerCase();
    
    if (dtypeName.includes('flood')) return 'flood';
    if (dtypeName.includes('cyclone') || dtypeName.includes('hurricane') || dtypeName.includes('typhoon')) return 'cyclone';
    if (dtypeName.includes('earthquake')) return 'earthquake';
    if (dtypeName.includes('epidemic') || dtypeName.includes('outbreak')) return 'epidemic';
    if (dtypeName.includes('drought')) return 'drought';
    if (dtypeName.includes('civil unrest') || dtypeName.includes('violence') || dtypeName.includes('conflict')) return 'civilUnrest';
    
    return 'others';
}

function getColor(location) {
    const eventType = getEventType(location);
    return eventColors[eventType] || eventColors.others;
}

function getSize(count) {
    // Scale marker size based on count
    return Math.min(8 + Math.log(count) * 3, 25);
}

function createMarker(location, animate = true) {
    const size = getSize(location.count);
    const color = getColor(location);

    const el = document.createElement('div');
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 0 15px rgba(0,0,0,0.7)';
    el.style.cursor = 'pointer';
    el.style.transition = 'opacity 0.5s';
    
    if (animate) {
        el.style.opacity = '0';
        setTimeout(() => { el.style.opacity = '1'; }, 50);
    }

    const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
            <h4>${location.country_name || 'Unknown'}</h4>
            <div><strong>Reports:</strong> ${location.count}</div>
            <div><strong>Type:</strong> ${location.dtype_name}</div>
            <div><strong>Category:</strong> ${getEventType(location).charAt(0).toUpperCase() + getEventType(location).slice(1)}</div>
            ${location.titles && location.titles.length > 0 ? 
                `<div style="margin-top: 8px; font-size: 10px; color: #aaa;">
                    ${location.titles.slice(0, 2).join('<br>')}
                </div>` : ''
            }
        `);

    const marker = new mapboxgl.Marker(el)
        .setLngLat([location.lon, location.lat])
        .setPopup(popup)
        .addTo(map);

    if (animate) {
        createRingAnimation(location, size, color);
    }

    return { marker, el };
}

let activeRings = [];

function createRingAnimation(location, size, color) {
    const ring = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [location.lon, location.lat]
        },
        properties: {
            color: color,
            progress: 0,
            size: size
        }
    };

    activeRings.push(ring);
    updateRings();

    const duration = 1500;
    const startTime = Date.now();

    function animateRing() {
        const progress = Math.min((Date.now() - startTime) / duration, 1);
        ring.properties.progress = progress;
        updateRings();

        if (progress < 1) {
            requestAnimationFrame(animateRing);
        } else {
            const index = activeRings.indexOf(ring);
            if (index > -1) {
                activeRings.splice(index, 1);
                updateRings();
            }
        }
    }

    requestAnimationFrame(animateRing);
}

function updateRings() {
    const source = map.getSource('rings');
    if (source) {
        source.setData({
            type: 'FeatureCollection',
            features: activeRings
        });
    }
}

function fadeOutMarkers(markers) {
    markers.forEach(({ marker, el }) => {
        el.style.opacity = '0';
        setTimeout(() => marker.remove(), 500);
    });
}

function updateEventCounts(monthData) {
    // Update cumulative counts for this month
    monthData.locations.forEach(location => {
        const eventType = getEventType(location);
        const count = location.count || 1;
        cumulativeCounts[eventType] += count;
    });
    
    // Update UI
    document.getElementById('covidCount').textContent = cumulativeCounts.covid.toLocaleString();
    document.getElementById('ukraineCount').textContent = cumulativeCounts.ukraine.toLocaleString();
    document.getElementById('floodCount').textContent = cumulativeCounts.flood.toLocaleString();
    document.getElementById('cycloneCount').textContent = cumulativeCounts.cyclone.toLocaleString();
    document.getElementById('earthquakeCount').textContent = cumulativeCounts.earthquake.toLocaleString();
    document.getElementById('epidemicCount').textContent = cumulativeCounts.epidemic.toLocaleString();
    document.getElementById('droughtCount').textContent = cumulativeCounts.drought.toLocaleString();
    document.getElementById('civilUnrestCount').textContent = cumulativeCounts.civilUnrest.toLocaleString();
    document.getElementById('othersCount').textContent = cumulativeCounts.others.toLocaleString();
}

function resetEventCounts() {
    cumulativeCounts = {
        covid: 0,
        ukraine: 0,
        flood: 0,
        cyclone: 0,
        earthquake: 0,
        epidemic: 0,
        drought: 0,
        civilUnrest: 0,
        others: 0
    };
    updateEventCounts({ locations: [] });
}

function showMonth(index, animate = true) {
    if (index < 0 || index >= monthlyData.length) return;

    const monthData = monthlyData[index];

    // Fade out current markers
    if (animate) {
        fadeOutMarkers(currentMarkers);
    } else {
        currentMarkers.forEach(({ marker }) => marker.remove());
    }
    currentMarkers = [];

    // Add new markers
    monthData.locations.forEach(location => {
        const markerObj = createMarker(location, animate);
        currentMarkers.push(markerObj);
    });

    // Update event counts
    updateEventCounts(monthData);

    // Update stats
    document.getElementById('currentMonth').textContent = 
        new Date(monthData.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long'
        });
    document.getElementById('monthlyReports').textContent = monthData.total_reports;
    document.getElementById('monthlyLocations').textContent = monthData.total_locations;

    // Update timeline
    document.getElementById('timeline-current').textContent = monthData.month;
    const progress = (index / (monthlyData.length - 1)) * 100;
    document.getElementById('timeline-progress').style.width = progress + '%';
}

function play() {
    if (isPlaying) return;
    isPlaying = true;
    document.getElementById('playPause').textContent = '⏸ Pause';

    // If starting from the beginning (index 0 with no markers), show first month
    if (currentMonthIndex === 0 && currentMarkers.length === 0) {
        resetEventCounts();
        showMonth(0, true);
        currentMonthIndex = 1;
    }

    animationInterval = setInterval(() => {
        if (currentMonthIndex >= monthlyData.length) {
            pause();
            return;
        }
        showMonth(currentMonthIndex, true);
        currentMonthIndex++;
    }, 800 / speed);
}

function pause() {
    isPlaying = false;
    document.getElementById('playPause').textContent = '▶ Play';
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
}

function restart() {
    pause();
    currentMonthIndex = 0;
    currentMarkers.forEach(({ marker }) => marker.remove());
    currentMarkers = [];
    activeRings = [];
    updateRings();
    resetEventCounts();
    
    // Don't show any data - wait for play to be clicked
    document.getElementById('timeline-current').textContent = 
        `${monthlyData[0].month} - ${monthlyData[monthlyData.length - 1].month}`;
    document.getElementById('timeline-progress').style.width = '0%';
    document.getElementById('currentMonth').textContent = '--';
    document.getElementById('monthlyReports').textContent = '0';
    document.getElementById('monthlyLocations').textContent = '0';
}

// Load aggregated data
fetch('field_reports_aggregated.json')
    .then(response => response.json())
    .then(data => {
        monthlyData = data;
        totalReportsCount = data.reduce((sum, month) => sum + month.total_reports, 0);
        
        console.log(`Loaded ${monthlyData.length} months of aggregated data`);
        console.log(`Total reports: ${totalReportsCount}`);
        
        document.getElementById('totalReports').textContent = totalReportsCount.toLocaleString();
        document.getElementById('timeline-current').textContent = 
            `${monthlyData[0].month} - ${monthlyData[monthlyData.length - 1].month}`;
        
        // Initialize with zero counts - don't show anything until play is clicked
        resetEventCounts();
    })
    .catch(error => {
        console.error('Error loading data:', error);
        document.getElementById('timeline-current').textContent = 'Error loading data';
    });

// Event listeners
document.getElementById('playPause').addEventListener('click', () => {
    isPlaying ? pause() : play();
});

document.getElementById('restart').addEventListener('click', restart);

document.getElementById('speedSlider').addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    document.getElementById('speedLabel').textContent = speed + 'x';
    if (isPlaying) {
        pause();
        play();
    }
});

// Timeline scrubbing
const timelineBar = document.getElementById('timeline-bar');
let isDragging = false;

function handleTimelineClick(e) {
    const rect = timelineBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const targetIndex = Math.floor(percent * monthlyData.length);
    
    pause();
    
    // Remove all current markers
    currentMarkers.forEach(({ marker }) => marker.remove());
    currentMarkers = [];
    activeRings = [];
    updateRings();
    
    currentMonthIndex = Math.max(0, Math.min(targetIndex, monthlyData.length - 1));
    
    // Reset and rebuild cumulative counts up to target index
    resetEventCounts();
    for (let i = 0; i <= currentMonthIndex; i++) {
        if (i < monthlyData.length) {
            updateEventCounts(monthlyData[i]);
        }
    }
    
    // Show the target month without animation
    showMonth(currentMonthIndex, false);
    
    // Move to next month for play to continue from here
    currentMonthIndex++;
}

timelineBar.addEventListener('mousedown', (e) => {
    isDragging = true;
    handleTimelineClick(e);
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) handleTimelineClick(e);
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

} // End of setupMap function

// Initialize the visualization when page loads
document.addEventListener('DOMContentLoaded', initializeVisualization);
