#!/usr/bin/env python3
"""
South Park Political Theme Analysis
Processes dialogue lines to identify political themes using keyword matching.
"""

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

def load_keywords(keywords_file):
    """Load keyword dictionary from JSON file."""
    with open(keywords_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def create_keyword_patterns(keywords_dict):
    """Create compiled regex patterns for efficient matching."""
    patterns = {}
    for theme, keywords in keywords_dict.items():
        # Create word boundary patterns for each keyword
        # This ensures we match whole words, not substrings
        keyword_patterns = []
        for keyword in keywords:
            # Escape special regex characters and add word boundaries
            escaped = re.escape(keyword)
            # Use word boundaries, but handle hyphenated words and numbers
            pattern = r'\b' + escaped + r'\b'
            keyword_patterns.append(pattern)
        
        # Combine all keywords for this theme into one pattern
        combined_pattern = '|'.join(keyword_patterns)
        patterns[theme] = re.compile(combined_pattern, re.IGNORECASE)
    
    return patterns

def find_themes_in_text(text, patterns):
    """Find all themes mentioned in a text string."""
    themes_found = set()
    for theme, pattern in patterns.items():
        if pattern.search(text):
            themes_found.add(theme)
    return themes_found

def process_dialogue_data(input_csv, keywords_dict):
    """Process dialogue data and count theme occurrences per episode."""
    patterns = create_keyword_patterns(keywords_dict)
    
    # Dictionary to store counts: {(season, episode_number, episode_name): {theme: count}}
    episode_themes = defaultdict(lambda: defaultdict(int))
    episode_metadata = {}  # Store episode names
    
    print(f"Loading dialogue data from {input_csv}...")
    
    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        line_count = 0
        for row in reader:
            line_count += 1
            if line_count % 10000 == 0:
                print(f"  Processed {line_count:,} lines...")
            
            text = row['text']
            season = int(row['season_number'])
            episode = int(row['episode_number'])
            episode_name = row['episode_name']
            
            # Store episode metadata
            episode_key = (season, episode)
            episode_metadata[episode_key] = episode_name
            
            # Find themes in this line
            themes = find_themes_in_text(text, patterns)
            
            # Increment count for each theme found
            for theme in themes:
                episode_themes[episode_key][theme] += 1
    
    print(f"Total lines processed: {line_count:,}")
    print(f"Total episodes found: {len(episode_themes)}")
    
    return episode_themes, episode_metadata

def write_timeseries_csv(episode_themes, episode_metadata, output_csv):
    """Write theme time series data to CSV in long format."""
    print(f"\nWriting output to {output_csv}...")
    
    # Create list of all rows
    rows = []
    episode_order = 0
    
    # Sort episodes by season and episode number
    sorted_episodes = sorted(episode_themes.keys())
    
    for season, episode in sorted_episodes:
        episode_order += 1
        episode_name = episode_metadata[(season, episode)]
        themes = episode_themes[(season, episode)]
        
        # Only write rows where count > 0
        for theme, count in sorted(themes.items()):
            if count > 0:
                rows.append({
                    'season': season,
                    'episode_number': episode,
                    'episode_name': episode_name,
                    'episode_order': episode_order,
                    'theme': theme,
                    'count': count
                })
    
    # Write to CSV
    with open(output_csv, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['season', 'episode_number', 'episode_name', 'episode_order', 'theme', 'count']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Written {len(rows):,} rows to {output_csv}")

def generate_summary(episode_themes, episode_metadata, keywords_dict, output_file):
    """Generate summary statistics."""
    print(f"\nGenerating summary statistics to {output_file}...")
    
    # Calculate total mentions per theme
    theme_totals = defaultdict(int)
    for episode_key, themes in episode_themes.items():
        for theme, count in themes.items():
            theme_totals[theme] += count
    
    # Find episodes with highest activity per theme
    theme_top_episodes = defaultdict(list)
    for episode_key, themes in episode_themes.items():
        season, episode = episode_key
        episode_name = episode_metadata[episode_key]
        for theme, count in themes.items():
            theme_top_episodes[theme].append((count, season, episode, episode_name))
    
    # Sort and keep top 5 per theme
    for theme in theme_top_episodes:
        theme_top_episodes[theme].sort(reverse=True)
        theme_top_episodes[theme] = theme_top_episodes[theme][:5]
    
    # Calculate seasonal trends
    season_totals = defaultdict(lambda: defaultdict(int))
    for episode_key, themes in episode_themes.items():
        season, episode = episode_key
        for theme, count in themes.items():
            season_totals[season][theme] += count
    
    # Write summary
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("SOUTH PARK POLITICAL THEME ANALYSIS - SUMMARY STATISTICS\n")
        f.write("=" * 80 + "\n\n")
        
        # Total mentions per theme (sorted)
        f.write("TOTAL MENTIONS PER THEME (Across All Episodes)\n")
        f.write("-" * 80 + "\n")
        for theme, total in sorted(theme_totals.items(), key=lambda x: x[1], reverse=True):
            f.write(f"{theme:40s}: {total:6,} mentions\n")
        
        f.write("\n" + "=" * 80 + "\n\n")
        
        # Top episodes per theme
        f.write("TOP 5 EPISODES PER THEME\n")
        f.write("-" * 80 + "\n\n")
        for theme in sorted(theme_totals.keys()):
            f.write(f"{theme}:\n")
            for count, season, episode, episode_name in theme_top_episodes[theme]:
                f.write(f"  S{season:02d}E{episode:02d} - {episode_name:45s}: {count:4} mentions\n")
            f.write("\n")
        
        f.write("=" * 80 + "\n\n")
        
        # Seasonal trends
        f.write("SEASONAL TRENDS (Top 5 Themes Per Season)\n")
        f.write("-" * 80 + "\n\n")
        for season in sorted(season_totals.keys()):
            f.write(f"Season {season}:\n")
            season_themes = sorted(season_totals[season].items(), key=lambda x: x[1], reverse=True)[:5]
            for theme, count in season_themes:
                f.write(f"  {theme:40s}: {count:5,} mentions\n")
            f.write("\n")
        
        f.write("=" * 80 + "\n")
        f.write(f"Total unique episodes analyzed: {len(episode_themes)}\n")
        f.write(f"Total themes tracked: {len(keywords_dict)}\n")
        f.write("=" * 80 + "\n")
    
    print(f"Summary statistics written to {output_file}")

def main():
    """Main processing function."""
    # File paths
    base_dir = Path(__file__).parent
    input_csv = base_dir / 'data' / 'sp_lines.csv'
    keywords_file = base_dir / 'keywords.json'
    output_csv = base_dir / 'theme_timeseries.csv'
    summary_file = base_dir / 'theme_summary.txt'
    
    print("South Park Political Theme Analysis")
    print("=" * 80)
    
    # Load keywords
    print(f"\nLoading keywords from {keywords_file}...")
    keywords_dict = load_keywords(keywords_file)
    print(f"Loaded {len(keywords_dict)} themes with keyword patterns")
    
    # Process dialogue data
    episode_themes, episode_metadata = process_dialogue_data(input_csv, keywords_dict)
    
    # Write output CSV
    write_timeseries_csv(episode_themes, episode_metadata, output_csv)
    
    # Generate summary
    generate_summary(episode_themes, episode_metadata, keywords_dict, summary_file)
    
    print("\n" + "=" * 80)
    print("Processing complete!")
    print(f"Output files:")
    print(f"  - {output_csv}")
    print(f"  - {summary_file}")
    print("=" * 80)

if __name__ == '__main__':
    main()

