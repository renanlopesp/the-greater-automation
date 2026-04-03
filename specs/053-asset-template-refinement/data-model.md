# Data Model: Asset Template Refinement

## Modified Entities

### CampaignAsset (extended)

Existing entity in `src/data/campaign-data.ts`. Add `product_name` field.

| Field            | Type       | Required | Description                                      |
| ---------------- | ---------- | -------- | ------------------------------------------------ |
| label            | string     | yes      | Format name (e.g., "Stories 9:16")               |
| ratio            | string     | yes      | Aspect ratio (e.g., "9:16")                      |
| bg               | string     | yes      | Background color (legacy, empty for HTML assets) |
| html             | string     | no       | Full HTML template with inline styles            |
| width            | number     | no       | Native pixel width (e.g., 1080)                  |
| height           | number     | no       | Native pixel height (e.g., 1920)                 |
| **product_name** | **string** | **no**   | **Name of the featured product (NEW)**           |

### Asset Format (conceptual, code constant)

Defines the 4 supported visual formats. Already exists as `ASSET_FORMATS` in `asset-generator.ts`.

| Field  | Type   | Description                         |
| ------ | ------ | ----------------------------------- |
| label  | string | Display name (e.g., "Stories 9:16") |
| ratio  | string | Aspect ratio                        |
| width  | number | Native pixel width                  |
| height | number | Native pixel height                 |

## Storage

No database schema changes. All asset data is stored in the existing `tasks.artifact_data` JSONB column in Supabase. The `campaigns[dateId].assets` array holds `CampaignAsset[]`.

## Data Flow

1. **Generation**: API route receives campaign with curated products → calls `generateAssets()` → returns `CampaignAsset[]` (one per product per format) → saved to `artifact_data`
2. **Display**: Client reads `campaign.assets` → groups by `label` → renders format sections with horizontal scroll
3. **Download**: Client renders HTML at native resolution offscreen → html2canvas captures → PNG blob download
