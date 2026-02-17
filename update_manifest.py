#!/usr/bin/env python3
"""
Script to fetch missing domains from API and update extension manifest.json
"""
import json
import requests

# Fetch domain stats from API
print("Fetching domain stats from API...")
response = requests.get("https://ratio.clocknumbers.com/api/ext-stats")
data = response.json()

print(f"Total recipes: {data['total_recipes']}")
print(f"Unique domains: {data['unique_domains']}")
print(f"Supported: {data['supported_count']}")
print(f"Missing: {data['missing_count']}")
print()

missing_domains = data['missing_domains']
print(f"Missing domains: {missing_domains}")
print()

if not missing_domains:
    print("No missing domains to add!")
    exit(0)

# Read manifest.json
print("Reading manifest.json...")
with open("extension/manifest.json", "r") as f:
    manifest = json.load(f)

# Add missing domains to all three lists
new_entries = [f"https://*.{domain}/*" for domain in missing_domains]

print(f"Adding {len(new_entries)} new domain patterns...")

# Update host_permissions
manifest["host_permissions"].extend(new_entries)
manifest["host_permissions"] = sorted(list(set(manifest["host_permissions"])))

# Update content_scripts matches
manifest["content_scripts"][0]["matches"].extend(new_entries)
manifest["content_scripts"][0]["matches"] = sorted(list(set(manifest["content_scripts"][0]["matches"])))

# Update web_accessible_resources matches
manifest["web_accessible_resources"][0]["matches"].extend(new_entries)
manifest["web_accessible_resources"][0]["matches"] = sorted(list(set(manifest["web_accessible_resources"][0]["matches"])))

# Write updated manifest
print("Writing updated manifest.json...")
with open("extension/manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)

print("✅ Manifest updated successfully!")
print(f"Added domains: {', '.join(missing_domains)}")
