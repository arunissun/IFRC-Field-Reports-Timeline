# IFRC Field Reports Timeline Visualization

Interactive 3D globe visualization of IFRC field reports data from 2018-2025, showing humanitarian events across time with event type categorization.

## 🌍 Live Demo

View the visualization at: [Your GitHub Pages URL]

## 🚀 Features

- **3D Globe Visualization** using Mapbox GL
- **Time-based Animation** showing reports month by month
- **Event Type Categorization**: COVID-19, Ukraine Conflict, Floods, Cyclones, Earthquakes, Epidemics, Droughts, Civil Unrest
- **Cumulative Event Counters** that update as timeline progresses
- **Interactive Timeline** with scrubbing and speed controls
- **Automatic Data Updates** via GitHub Actions

## 📁 Project Structure

```
├── globe_visualization_optimized.html  # Main HTML file
├── styles.css                           # Styling
├── script.js                            # JavaScript logic
├── config.js                            # Configuration (NOT in repo)
├── config.example.js                    # Template for config
├── fetch_reports.py                     # Fetch data from IFRC API
├── aggregate_reports.py                 # Process and aggregate data
├── field_reports_aggregated.json        # Processed data for visualization
└── .github/workflows/update-data.yml    # Auto-update workflow
```

## 🔧 Setup

### 1. Clone the repository

```bash
git clone https://github.com/arunissun/IFRC-Field-Reports-Timeline.git
cd IFRC-Field-Reports-Timeline
```

### 2. Set up Mapbox Token (Local Development)

```bash
# Copy the example config file
cp config.example.js config.js

# Edit config.js and add your Mapbox token
# Get a free token at: https://account.mapbox.com/
```

**Important**: `config.js` is gitignored and will NOT be committed to the repository.

### 3. Open the visualization

Simply open `globe_visualization_optimized.html` in a web browser.

## 🔐 Secret Management

### For Local Development:
- Copy `config.example.js` to `config.js`
- Add your Mapbox token to `config.js`
- This file is gitignored and won't be committed

### For GitHub Pages Deployment:
The Mapbox token in the deployed version should have URL restrictions set to only work on your domain.

1. Go to [Mapbox Account Tokens](https://account.mapbox.com/access-tokens/)
2. Add URL restrictions:
   - `https://arunissun.github.io/*`
   - Any other domains where you'll embed this

### For GitHub Actions (Python scripts):
1. Go to your repository Settings → Secrets and variables → Actions
2. Add a new secret named `IFRC_API_TOKEN`
3. Value: Your IFRC GO API token (`2670a81f5e7146b16e7f9efba63f36b3d7ff97a8`)

## 📊 Data Pipeline

### Manual Update:

```bash
# Install Python dependencies
pip install requests

# Fetch latest field reports
python fetch_reports.py

# Aggregate data for visualization
python aggregate_reports.py
```

### Automatic Update:

GitHub Actions runs daily at 2 AM UTC to:
1. Fetch latest field reports from IFRC API
2. Aggregate and process the data
3. Commit updated JSON files to the repository

You can also trigger it manually from the Actions tab.

## 🎨 Customization

### Event Colors

Edit the `eventColors` object in `script.js`:

```javascript
const eventColors = {
    'covid': '#ff4444',
    'ukraine': '#ff8800',
    'flood': '#2196F3',
    // ... add more
};
```

### Animation Speed

Adjust the speed range in `globe_visualization_optimized.html`:

```html
<input type="range" id="speedSlider" min="1" max="5" value="1">
```

## 📝 License

This project visualizes publicly available humanitarian data from the IFRC GO platform.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

**Data Source**: [IFRC GO API](https://goadmin.ifrc.org/api/v2/)
