# scripts/update_scholar_metrics.py

import json
import sys
from pathlib import Path
from datetime import datetime, timezone

try:
    from scholarly import scholarly
except ImportError:
    print("Error: 'scholarly' package not installed. Run: pip install scholarly", file=sys.stderr)
    sys.exit(1)

# ---- CONFIGURATION ----
# Your Google Scholar author ID (from ?user=... in your profile URL)
AUTHOR_ID = "eDJs5bAAAAAJ"   # <- change if needed

# Where to store the JSON inside your repo
OUTPUT_PATH = Path("data/scholar_metrics.json")
# ------------------------


def fetch_scholar_metrics(author_id: str):
    """Fetch total citations, h-index, and i10-index for a Scholar author."""
    try:
        author = scholarly.search_author_id(author_id)
        author = scholarly.fill(author)  # populate full data
    
        cites = author.get("citedby", None)
        indices = author.get("hindex", None)
        i10 = author.get("i10index", None)
    
        return {
            "citations": cites,
            "hIndex": indices,
            "i10Index": i10,
        }
    
    except Exception as e:
        print(f"Error fetching Scholar metrics: {e}", file=sys.stderr)
        return None


def main():
    metrics = fetch_scholar_metrics(AUTHOR_ID)

    # Add updatedAt field in ISO format (UTC)
    metrics["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Ensure parent directory exists
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    print(f"Wrote metrics to {OUTPUT_PATH.resolve()}:")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()