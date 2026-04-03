# Tool Contract: SNEW_MODIFY_ARTIFACT

## Description

Modify the artifact displayed in the task's side panel. Supports calendar-specific operations: generating campaigns, filtering/removing dates, and clearing campaign content.

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "operation": {
      "type": "string",
      "enum": ["generate_campaign", "filter_dates", "remove_dates", "clear_campaigns"],
      "description": "The modification operation to perform"
    },
    "date_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Date IDs to operate on (e.g., ['dia-das-maes-2026'])"
    },
    "except": {
      "type": "boolean",
      "description": "Invert selection (for clear_campaigns: clear all EXCEPT listed IDs)"
    }
  },
  "required": ["operation"]
}
```

## Operations

### generate_campaign

Generate full campaign content for one date.

- **Input**: `date_ids` with exactly 1 ID
- **Behavior**: Loads brand_dna + products, calls `generateCampaign()`, saves to `artifact_data.campaigns[dateId]`
- **Success**: `{ success: true, message: "Campaign generated for X", campaign_date: "X" }`
- **Error**: `{ error: "Date ID not found" }` or `{ error: "Brand DNA not found" }`

### filter_dates

Keep only the specified dates, remove everything else.

- **Input**: `date_ids` with IDs to keep
- **Behavior**: Filters `dates` array + `campaigns` object to only include listed IDs
- **Success**: `{ success: true, message: "N dates remaining", remaining_dates: [...] }`
- **Error**: `{ error: "Date IDs not found: X, Y. Valid: ..." }`

### remove_dates

Remove specific dates from the calendar.

- **Input**: `date_ids` with IDs to remove
- **Behavior**: Removes listed IDs from `dates` array + `campaigns` object
- **Success**: `{ success: true, message: "N dates remaining", remaining_dates: [...] }`
- **Error**: `{ error: "Date IDs not found: ..." }`

### clear_campaigns

Clear generated campaign content while keeping dates in the list.

- **Input**: `date_ids` with IDs, optionally `except: true`
- **Behavior**: Removes entries from `campaigns` object for listed IDs. With `except: true`, clears all campaigns EXCEPT listed IDs.
- **Success**: `{ success: true, message: "N campaigns remaining", remaining_campaigns: [...] }`
- **Error**: `{ error: "Date IDs not found: ..." }`

## Validation

All operations that accept `date_ids` validate that every ID exists in the current `artifact_data.dates` array before performing any mutation. On validation failure, returns error with the list of valid IDs.

## Atomicity

Each operation is atomic: it loads the current state, applies the mutation, and saves in a single update. If the save fails, the original data is unchanged.

## Authorization

The tool uses the `serviceClient` (service role) passed from the chat route. The chat route has already authenticated the user and resolved the team. The tool only operates on the task identified by `taskId` (set when the tool is registered).
