import json
from datetime import datetime
from collections import defaultdict

def aggregate_by_month(input_file="field_reports.json", output_file="field_reports_aggregated.json"):
    """
    Aggregate field reports by month and location.
    Creates time bins with counts per location for efficient visualization.
    """
    print("Loading field reports...")
    with open(input_file, 'r', encoding='utf-8') as f:
        reports = json.load(f)
    
    print(f"Loaded {len(reports)} reports")
    
    # Group by month and location
    monthly_bins = defaultdict(lambda: defaultdict(list))
    skipped_no_coords = 0
    skipped_no_date = 0
    skipped_invalid_date = 0
    
    for report in reports:
        # Skip reports without coordinates
        if not report.get('lat') or not report.get('lon'):
            skipped_no_coords += 1
            continue
        
        # Parse date and create month key
        created_at = report.get('created_at')
        if not created_at:
            skipped_no_date += 1
            continue
        
        try:
            dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            # Skip reports before 2018-03-01 (exclude Jan & Feb 2018 bulk import) or after 2025-12-31
            if dt.year < 2018 or dt.year > 2025:
                skipped_invalid_date += 1
                continue
            
            # Skip January and February 2018 (bulk data import period)
            if dt.year == 2018 and dt.month < 3:
                skipped_invalid_date += 1
                continue
                
            month_key = dt.strftime('%Y-%m')  # Format: "2018-01"
            
            # Create location key (rounded to reduce duplicates)
            lat = round(float(report['lat']), 2)
            lon = round(float(report['lon']), 2)
            location_key = f"{lat},{lon}"
            
            # Add report to this month/location bin
            monthly_bins[month_key][location_key].append(report)
            
        except (ValueError, TypeError) as e:
            print(f"Error parsing date for report {report.get('id')}: {e}")
            skipped_invalid_date += 1
            continue
    
    print(f"\nSkipped: {skipped_no_coords} (no coords), {skipped_no_date} (no date), {skipped_invalid_date} (invalid date)")
    
    # Convert to aggregated format
    aggregated = []
    
    for month_key in sorted(monthly_bins.keys()):
        locations = monthly_bins[month_key]
        
        # Aggregate by location for this month
        location_data = []
        
        for location_key, location_reports in locations.items():
            lat_str, lon_str = location_key.split(',')
            
            # Count by event type
            event_counts = defaultdict(int)
            dtype_counts = defaultdict(int)
            covid_count = 0
            
            for r in location_reports:
                event_name = r.get('event_name') or 'Unknown'
                dtype_name = r.get('dtype_name') or 'Unknown'
                
                event_counts[event_name] += 1
                dtype_counts[dtype_name] += 1
                
                if r.get('is_covid_report'):
                    covid_count += 1
            
            # Get the most common event and dtype
            most_common_event = max(event_counts.items(), key=lambda x: x[1])[0] if event_counts else 'Unknown'
            most_common_dtype = max(dtype_counts.items(), key=lambda x: x[1])[0] if dtype_counts else 'Unknown'
            
            # Use first report's data for other fields
            first_report = location_reports[0]
            
            location_data.append({
                'lat': float(lat_str),
                'lon': float(lon_str),
                'count': len(location_reports),
                'country_name': first_report.get('country_name'),
                'country_iso3': first_report.get('country_iso3'),
                'region_name': first_report.get('region_name'),
                'event_name': most_common_event,
                'dtype_name': most_common_dtype,
                'is_covid': covid_count > len(location_reports) / 2,  # Majority COVID
                'reports': [r.get('id') for r in location_reports],  # Store IDs for reference
                'titles': list(set([r.get('title') for r in location_reports if r.get('title')]))[:3]  # Top 3 unique titles
            })
        
        # Sort by count (descending) and limit to top N hotspots per month
        location_data.sort(key=lambda x: x['count'], reverse=True)
        
        # Limit to top 50 hotspots per month to avoid clutter
        MAX_POINTS_PER_MONTH = 50
        location_data = location_data[:MAX_POINTS_PER_MONTH]
        
        aggregated.append({
            'month': month_key,
            'date': f"{month_key}-01",  # First day of month for timeline
            'total_reports': sum(loc['count'] for loc in location_data),
            'total_locations': len(location_data),
            'locations': location_data
        })
    
    # Save aggregated data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(aggregated, f, indent=2, ensure_ascii=False)
    
    print(f"\nAggregation complete!")
    print(f"Total months: {len(aggregated)}")
    print(f"Date range: {aggregated[0]['month']} to {aggregated[-1]['month']}")
    print(f"Total reports processed: {sum(m['total_reports'] for m in aggregated)}")
    print(f"Average locations per month: {sum(m['total_locations'] for m in aggregated) / len(aggregated):.1f}")
    print(f"Saved to: {output_file}")
    
    return aggregated

if __name__ == "__main__":
    aggregate_by_month()
