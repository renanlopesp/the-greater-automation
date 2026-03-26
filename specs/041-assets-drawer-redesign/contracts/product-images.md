# API Contract: Product Images

## GET /api/store/products/images

Fetches product images for the assets drawer. Returns up to 6 curated product images from the Nuvemshop API.

### Request

No body required. Authenticated via session cookie.

### Response 200

```json
{
  "images": [
    {
      "name": "romper-vanilla.jpg",
      "url": "https://d2r9epyceweg5n.cloudfront.net/stores/...",
      "label": "Produto",
      "productName": "Romper Vanilla"
    }
  ],
  "storeName": "Milkes"
}
```

### Response 401

```json
{ "error": "Unauthorized" }
```

### Response 404

```json
{ "error": "No store found" }
```

### Notes

- Returns max 6 images, prioritizing products with images
- Each image includes the first image from the Nuvemshop product's images array
- `label` is always "Produto" for MVP (future: detect banners, lifestyle images)
- `name` is derived from product name, slugified with extension
