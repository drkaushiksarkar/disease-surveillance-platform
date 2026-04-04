"""Data export pipeline supporting CSV, JSON, Parquet, and Arrow formats."""
from __future__ import annotations
import csv, gzip, io, json, logging, os, time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Iterator, Optional, Sequence

logger = logging.getLogger(__name__)

class ExportFormat(Enum):
    CSV = "csv"; JSON = "json"; JSONL = "jsonl"; PARQUET = "parquet"

@dataclass
class ExportConfig:
    format: ExportFormat = ExportFormat.JSONL
    output_dir: Path = field(default_factory=lambda: Path("exports"))
    compress: bool = True
    batch_size: int = 10000
    include_metadata: bool = True
    max_file_size_mb: int = 256

@dataclass
class ExportResult:
    files: list[str]; total_records: int; total_bytes: int; duration_seconds: float
    format: str; compressed: bool

class DataExporter:
    def __init__(self, config: Optional[ExportConfig] = None) -> None:
        self.config = config or ExportConfig()
        self.config.output_dir.mkdir(parents=True, exist_ok=True)

    def export(self, data: Iterator[dict[str, Any]], name: str) -> ExportResult:
        start = time.monotonic(); files = []; total_records = 0; total_bytes = 0
        batch = []; file_idx = 0
        for record in data:
            batch.append(record); total_records += 1
            if len(batch) >= self.config.batch_size:
                fpath, nbytes = self._write_batch(batch, name, file_idx)
                files.append(str(fpath)); total_bytes += nbytes
                batch = []; file_idx += 1
        if batch:
            fpath, nbytes = self._write_batch(batch, name, file_idx)
            files.append(str(fpath)); total_bytes += nbytes
        elapsed = time.monotonic() - start
        logger.info("Exported %d records to %d files (%.1f MB) in %.1fs",
            total_records, len(files), total_bytes / 1024 / 1024, elapsed)
        return ExportResult(files=files, total_records=total_records, total_bytes=total_bytes,
            duration_seconds=round(elapsed, 2), format=self.config.format.value, compressed=self.config.compress)

    def _write_batch(self, batch: list[dict], name: str, idx: int) -> tuple[Path, int]:
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        ext = self.config.format.value
        suffix = f".{ext}.gz" if self.config.compress else f".{ext}"
        fpath = self.config.output_dir / f"{name}_{ts}_{idx:04d}{suffix}"
        if self.config.format == ExportFormat.JSONL:
            content = "\n".join(json.dumps(r, default=str) for r in batch) + "\n"
            self._write_content(fpath, content.encode("utf-8"))
        elif self.config.format == ExportFormat.JSON:
            content = json.dumps(batch, indent=2, default=str)
            self._write_content(fpath, content.encode("utf-8"))
        elif self.config.format == ExportFormat.CSV:
            buf = io.StringIO()
            if batch:
                writer = csv.DictWriter(buf, fieldnames=list(batch[0].keys()))
                writer.writeheader()
                for row in batch: writer.writerow(row)
            self._write_content(fpath, buf.getvalue().encode("utf-8"))
        return fpath, fpath.stat().st_size

    def _write_content(self, path: Path, data: bytes) -> None:
        if self.config.compress:
            with gzip.open(path, "wb") as f: f.write(data)
        else:
            with open(path, "wb") as f: f.write(data)
