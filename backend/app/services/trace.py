from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Iterator

from app.models.incident import TraceStep


class TraceCollector:
    def __init__(self) -> None:
        self.steps: list[TraceStep] = []

    @contextmanager
    def step(
        self,
        name: str,
        provider: str,
        detail: str,
        model: str | None = None,
        status: str = "ok",
    ) -> Iterator[dict]:
        started = time.perf_counter()
        meta: dict = {"status": status, "detail": detail}
        try:
            yield meta
        except Exception as exc:  # noqa: BLE001
            meta["status"] = "error"
            meta["detail"] = f"{detail} | {exc}"
            raise
        finally:
            latency = int((time.perf_counter() - started) * 1000)
            self.steps.append(
                TraceStep(
                    step=name,
                    provider=provider,
                    detail=meta.get("detail", detail),
                    model=model,
                    latency_ms=latency,
                    status=meta.get("status", status),  # type: ignore[arg-type]
                )
            )
