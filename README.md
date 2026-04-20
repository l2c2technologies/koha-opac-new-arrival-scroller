# Koha OPAC new arrivals scroller

A self-contained auto-scrolling "New Arrivals" widget for the Koha ILS OPAC homepage. Displays the most recently accessioned titles with covers, bibliographic details, per-record action buttons (find more by author, find more on subject, share link), and seamless vertical auto-scroll with pause on hover.

## Features

- Auto-scrolling vertical list of new arrivals, pause on hover
- Cover image fallback chain: Koha local cover → Amazon cover via ISBN-10 → styled placeholder
- ISBN-13 to ISBN-10 conversion for Amazon cover URLs
- Robust `naturalHeight <= 1` detection to catch Koha and Amazon 1x1 placeholder sentinels
- Per-row round action buttons for finding more by the same author, on the same subject, or sharing the record link
- Graceful disabled state for buttons when author or subject data is missing
- Native share sheet on mobile via `navigator.share`, clipboard fallback on desktop
- Loading spinner during the initial AJAX fetch
- Fullscreen loading overlay on link-click navigation (dismissed on bfcache restore)
- Automatic viewport sizing: caps visible rows at ~2.7 to leave a peek of the next row, hinting scrollability
- Variable row heights supported (titles never get truncated)
- Minimal dependencies: jQuery (already bundled with Koha) and FontAwesome solid icons (also bundled)

## Requirements

- Koha 24.11 or later (tested on 24.11)
- FontAwesome 6 solid (bundled with Koha 24.11)
- jQuery (bundled with Koha)

## Installation

### 1. Create the SQL report

Import `report.sql` into Koha via Reports → Create from SQL. Note the report ID assigned by Koha after saving.

### 2. Configure the JS

Open `opacuserjs.js` and edit the `NA_CONFIG` block at the top:

- Set `reportId` to the ID assigned to your saved report in step 1
- Set `spinnerUrl` to a publicly accessible URL for your loading spinner GIF
- Adjust `accentColor`, `stepInterval`, `visibleRows` and other UI parameters if needed

### 3. Paste into Koha system preferences

- `OpacMainUserBlock`: paste the contents of `OpacMainUserBlock.html` (or merge the `#newArrivalsScroller` block into your existing homepage layout)
- `opacusercss`: append the contents of `opacusercss.css`
- `opacuserjs`: append the contents of `opacuserjs.js`

### 4. Hard refresh the OPAC

Open the OPAC homepage in a browser with cache disabled. Confirm the spinner appears, then rows render after the AJAX completes.

## Configuration reference

All tunables are collected at the top of `opacuserjs.js` in the `NA_CONFIG` object:

| Key | Default | Meaning |
|-----|---------|---------|
| `reportId` | `5` | Saved SQL report ID in Koha |
| `spinnerUrl` | `''` | URL to your loading spinner GIF |
| `accentColor` | `'#0F6E56'` | Primary accent colour (also set in CSS) |
| `stepInterval` | `3500` | Milliseconds between scroll steps |
| `transitionMs` | `600` | CSS transition duration for each step |
| `visibleRows` | `2.7` | Approximate rows visible in the viewport |
| `opacDetailPath` | `/cgi-bin/koha/opac-detail.pl?biblionumber=` | Koha record detail URL prefix |
| `opacSearchPath` | `/cgi-bin/koha/opac-search.pl` | Koha OPAC search endpoint |
| `opacImagePath` | `/cgi-bin/koha/opac-image.pl?thumbnail=1&biblionumber=` | Koha local cover image endpoint |

## SQL report notes

The SQL pulls the first MARC 650$a as a subject using `ExtractValue` on the MARCXML blob in `biblio_metadata`. The `TRIM(BOTH '.,;:/ ' FROM ...)` strips cataloguer end-punctuation. The `INTERVAL 765 DAY` window and the `LIMIT 50` can be adjusted to suit local accessioning rates.

## Author and license

Author: Indranil Das Gupta

Copyright: L2C2 Technologies

License: GNU General Public License v3.0 or later. 
