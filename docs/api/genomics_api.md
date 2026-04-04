# Genomics API Reference

## Endpoints

### GET /api/v1/genomics

Returns all genomics records.

**Parameters:**
- `limit` (int): Max results (default: 100)
- `offset` (int): Pagination offset
- `filter` (string): Filter expression

### POST /api/v1/genomics

Create a new genomics record.

**Request Body:**
```json
{
  "name": "string",
  "type": "string",
  "metadata": {}
}
```

### GET /api/v1/genomics/{id}

Get genomics by ID.

### DELETE /api/v1/genomics/{id}

Delete genomics record.
