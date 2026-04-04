# Morbidity API Reference

## Endpoints

### GET /api/v1/morbidity

Returns all morbidity records.

**Parameters:**
- `limit` (int): Max results (default: 100)
- `offset` (int): Pagination offset
- `filter` (string): Filter expression

### POST /api/v1/morbidity

Create a new morbidity record.

**Request Body:**
```json
{
  "name": "string",
  "type": "string",
  "metadata": {}
}
```

### GET /api/v1/morbidity/{id}

Get morbidity by ID.

### DELETE /api/v1/morbidity/{id}

Delete morbidity record.
