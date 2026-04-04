# Pathogen API Reference

## Endpoints

### GET /api/v1/pathogen

Returns all pathogen records.

**Parameters:**
- `limit` (int): Max results (default: 100)
- `offset` (int): Pagination offset
- `filter` (string): Filter expression

### POST /api/v1/pathogen

Create a new pathogen record.

**Request Body:**
```json
{
  "name": "string",
  "type": "string",
  "metadata": {}
}
```

### GET /api/v1/pathogen/{id}

Get pathogen by ID.

### DELETE /api/v1/pathogen/{id}

Delete pathogen record.
