import requests
import json
import csv
from datetime import datetime
import time

# API configuration
BASE_URL = "https://goadmin.ifrc.org/api/v2/field-report/"
COUNTRY_URL = "https://goadmin.ifrc.org/api/v2/country/"
HEADERS = {
    "Authorization": "Token 2670a81f5e7146b16e7f9efba63f36b3d7ff97a8"
}
LIMIT = 400  # Number of records per request - reduced to avoid server overload

# Cache for country coordinates
country_coords_cache = {}

def fetch_country_coordinates():
    """
    Fetch all countries and their coordinates from the IFRC API.
    Returns a dictionary mapping country_id to {lat, lon}.
    """
    print("Fetching country coordinates...")
    all_countries = []
    offset = 0
    
    while True:
        params = {
            "limit": LIMIT,
            "offset": offset
        }
        
        try:
            response = requests.get(COUNTRY_URL, headers=HEADERS, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            countries = data.get("results", [])
            
            if not countries:
                break
            
            all_countries.extend(countries)
            offset += LIMIT
            print(f"Fetched {len(countries)} countries (total: {len(all_countries)})")
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching country data: {e}")
            break
    
    # Build the cache
    coords_map = {}
    for country in all_countries:
        country_id = country.get("id")
        centroid = country.get("centroid")
        
        if country_id and centroid and centroid.get("coordinates"):
            coords = centroid["coordinates"]
            if len(coords) >= 2:
                coords_map[country_id] = {
                    "lon": coords[0],
                    "lat": coords[1]
                }
    
    print(f"Cached coordinates for {len(coords_map)} countries")
    return coords_map

def fetch_field_reports():
    """
    Fetch field reports from the IFRC API with pagination.
    Filters for reports created after January 1, 2018.
    """
    all_reports = []
    offset = 0

    # Set the date filter for reports after January 1, 2018
    start_date = "2018-01-01T00:00:00Z"

    while True:
        params = {
            "limit": LIMIT,
            "offset": offset,
            "created_at__gte": start_date
        }

        try:
            print(f"Fetching offset {offset}...")
            response = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()
            reports = data.get("results", [])

            if not reports:
                print("No more data available")
                break

            # Extract only the required fields from each report
            simplified_reports = [extract_report_fields(report) for report in reports]
            all_reports.extend(simplified_reports)
            
            print(f"Fetched {len(reports)} reports (total: {len(all_reports)})")
            
            offset += LIMIT

            # 2 second delay between requests
            time.sleep(2)

        except requests.exceptions.RequestException as e:
            print(f"Error fetching data at offset {offset}: {e}")
            print(f"Saving {len(all_reports)} reports fetched so far.")
            break

    return all_reports

def extract_report_fields(report):
    """
    Extract specific fields from a field report.
    """
    # Extract country details (take first country if multiple)
    country_info = {}
    if report.get("countries_details") and len(report["countries_details"]) > 0:
        country = report["countries_details"][0]
        country_id = country.get("id")
        country_info = {
            "country_name": country.get("name"),
            "country_iso3": country.get("iso3"),
            "country_id": country_id
        }
        
        # Add lat/lon from cache
        if country_id and country_id in country_coords_cache:
            country_info["lat"] = country_coords_cache[country_id]["lat"]
            country_info["lon"] = country_coords_cache[country_id]["lon"]

    # Extract region details (take first region if multiple)
    region_info = {}
    if report.get("regions_details") and len(report["regions_details"]) > 0:
        region = report["regions_details"][0]
        region_info = {
            "region_name": region.get("region_name") or region.get("name")
        }

    # Extract the required fields
    simplified_report = {
        "id": report.get("id"),
        "dtype_name": report.get("dtype_details") and report["dtype_details"].get("name"),
        "title": report.get("title"),
        "visibility_display": report.get("visibility_display"),
        "event_name": report.get("event_details") and report["event_details"].get("name"),
        "is_covid_report": report.get("is_covid_report"),
        "created_at": report.get("created_at"),
        **country_info,
        **region_info
    }

    return simplified_report

def save_to_json(reports, filename="field_reports.json"):
    """Save reports to JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(reports, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(reports)} reports to {filename}")





if __name__ == "__main__":
    print("Fetching field reports from IFRC API...")
    
    # First, fetch and cache all country coordinates
    country_coords_cache = fetch_country_coordinates()
    
    # Then fetch field reports
    reports = fetch_field_reports()

    if reports:
        save_to_json(reports)
        print(f"Successfully fetched and saved {len(reports)} field reports")
    else:
        print("No reports found")
