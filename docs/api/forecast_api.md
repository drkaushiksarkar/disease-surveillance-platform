# Forecast API Reference

## Endpoints

### GET /api/v1/forecast

Returns all forecast records.

**Parameters:**
- `limit` (int): Max results (default: 100)
- `offset` (int): Pagination offset
- `filter` (string): Filter expression

### POST /api/v1/forecast

Create a new forecast record.

**Request Body:**
```json
{
  "name": "string",
  "type": "string",
  "metadata": {}
}
```

### GET /api/v1/forecast/{id}

Get forecast by ID.

### DELETE /api/v1/forecast/{id}

Delete forecast record.
