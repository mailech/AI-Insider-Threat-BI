"""
ITBIS Endpoint Agent — shared WMI plumbing for event-subscription collectors.

Two rules every WMI collector must follow, both learned the hard way:

1. **COM objects belong to the thread that created them.**  The runtime calls
   `collector.start()` on the main thread but runs `collector.collect()` on a
   worker thread.  The collectors used to build their WMI watcher in
   `start()` and poll it in `collect()`; every `NextEvent` call then failed
   with CO_E_NOTINITIALIZED, the error was swallowed, and the process and USB
   collectors produced *no events at all*.  Create and use WMI objects inside
   `com_apartment()` on the collecting thread.

2. **A timeout is not an error.**  `NextEvent(timeout)` raises when no event
   arrives in time — that happens every poll on a quiet machine.  Anything
   else is a real fault and must be visible, which is what
   `PollErrorReporter` is for.
"""
from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

# WBEM_E_TIMED_OUT (0x80043001): NextEvent returned because nothing arrived.
WBEM_E_TIMED_OUT = -2147209215


@contextmanager
def com_apartment() -> Iterator[None]:
    """Initialise COM for the current thread for the duration of the block."""
    import pythoncom  # type: ignore

    pythoncom.CoInitialize()
    try:
        yield
    finally:
        pythoncom.CoUninitialize()


def is_timeout(exc: BaseException) -> bool:
    """
    True if a `NextEvent` failure only means "no event within the timeout".

    pywintypes.com_error carries `(hresult, text, excepinfo, argerr)`; the WMI
    status code is `excepinfo[5]`.
    """
    args = getattr(exc, "args", ())
    if len(args) >= 3 and isinstance(args[2], tuple) and len(args[2]) > 5:
        return args[2][5] == WBEM_E_TIMED_OUT
    return False


class PollErrorReporter:
    """
    Report a failing WMI poll loudly — once per distinct error, not per poll.

    A persistent fault would otherwise log every second; a silent one is how
    the thread-affinity bug above went unnoticed.
    """

    def __init__(self, log, collector_name: str) -> None:
        self._log = log
        self._name = collector_name
        self._last: str | None = None

    def failed(self, exc: BaseException, **context) -> None:
        message = str(exc)
        if message == self._last:
            return
        self._last = message
        self._log.error(
            "collector.wmi_poll_error",
            name=self._name,
            error=message,
            hint="The WMI subscription is failing; this collector is not receiving events.",
            **context,
        )

    def recovered(self) -> None:
        if self._last is not None:
            self._log.info("collector.wmi_poll_recovered", name=self._name)
            self._last = None
