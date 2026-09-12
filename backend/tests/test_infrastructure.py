"""The optional-backend adapters: cache, document store, mailer, search.

These all run in fallback mode here -- no Redis, no MongoDB, no OpenSearch --
which is exactly the configuration that has to keep working. The point of these
tests is that the platform is fully functional on PostgreSQL alone.
"""
from __future__ import annotations

import time

import pytest

from app.core import mailer
from app.core.cache import Cache, invalidate_analytics
from app.core.documents import CASE_NOTES, RAW_EVENTS, DocumentStore
from app.core.search import EVENTS_INDEX, search_backend


@pytest.fixture
def store(db):
    """A document store whose writes are committed, not left pending.

    ``store()`` flushes but does not commit -- it participates in whatever
    transaction its caller owns. In a test that means an open write transaction
    on the shared session, which locks SQLite against the TestClient's own
    connections. Committing here releases it.
    """
    yield DocumentStore()
    db.commit()


# ------------------------------------------------------------------- cache
def test_cache_falls_back_to_memory_without_redis():
    cache = Cache()
    assert cache.backend == "memory"
    assert cache.available is False


def test_cache_round_trips_a_value():
    cache = Cache()
    cache.set("k1", {"hello": "world", "n": 3}, ttl=30)
    assert cache.get("k1") == {"hello": "world", "n": 3}


def test_cache_miss_returns_none():
    assert Cache().get("never-written") is None


def test_cache_expires_entries():
    cache = Cache()
    cache.set("short", {"v": 1}, ttl=1)
    assert cache.get("short") == {"v": 1}
    time.sleep(1.1)
    assert cache.get("short") is None


def test_cache_invalidates_by_prefix():
    cache = Cache()
    cache.set("dash:a", {"v": 1}, ttl=60)
    cache.set("dash:b", {"v": 2}, ttl=60)
    cache.set("other:c", {"v": 3}, ttl=60)
    removed = cache.invalidate("dash:")
    assert removed == 2
    assert cache.get("dash:a") is None
    assert cache.get("other:c") == {"v": 3}


def test_get_or_set_computes_once_then_serves_the_cached_value():
    cache = Cache()
    calls = {"n": 0}

    def producer():
        calls["n"] += 1
        return {"computed": calls["n"]}

    first = cache.get_or_set("memo", producer, ttl=60)
    second = cache.get_or_set("memo", producer, ttl=60)
    assert first == second == {"computed": 1}
    assert calls["n"] == 1


def test_non_json_values_are_coerced_not_raised():
    """Cached values are read models bound for JSON anyway, so ``default=str``
    coerces what it cannot encode. The contract that matters is that a caller
    never sees an exception from the cache."""
    cache = Cache()
    cache.set("bad", {"fn": lambda: None}, ttl=30)
    assert isinstance(cache.get("bad")["fn"], str)


def test_invalidate_analytics_is_safe_to_call():
    assert invalidate_analytics() >= 0


# --------------------------------------------------------- document store
def test_documents_fall_back_to_postgres_without_mongo():
    store = DocumentStore()
    assert store.backend == "postgresql"
    assert store.available is False


def test_document_store_persists_and_reads_back(db, store):
    store.store(CASE_NOTES, {"title": "Interview note", "text": "Spoke to line manager"}, db=db, ref_id="77")
    found = store.find(CASE_NOTES, ref_id="77", db=db)
    assert len(found) == 1
    assert found[0]["title"] == "Interview note"
    assert found[0]["ref_id"] == "77"
    assert "document_id" in found[0]


def test_document_store_scopes_reads_by_ref(db, store):
    store.store(CASE_NOTES, {"title": "Belongs to 100"}, db=db, ref_id="100")
    store.store(CASE_NOTES, {"title": "Belongs to 200"}, db=db, ref_id="200")
    assert all(d["ref_id"] == "100" for d in store.find(CASE_NOTES, ref_id="100", db=db))


def test_document_store_bulk_write(db, store):
    before = store.count(RAW_EVENTS, db=db)
    written = store.store_many(
        RAW_EVENTS,
        [{"activity_type": "login", "ref_id": "5"}, {"activity_type": "logout", "ref_id": "5"}],
        db=db,
    )
    assert written == 2
    assert store.count(RAW_EVENTS, db=db) == before + 2


def test_document_store_without_a_session_does_not_raise():
    # Archiving is supplementary: losing it must never break the caller.
    assert DocumentStore().store(CASE_NOTES, {"title": "nowhere to go"}) is not None


# ------------------------------------------------------------------ mailer
def test_email_is_logged_not_sent_when_disabled():
    record = mailer.send(["soc@test.io"], "Critical alert", "body", severity="critical")
    assert record["mode"] == "logged"
    assert record["delivered"] is False
    assert record["error"] is None


def test_email_threshold_gates_low_severity():
    assert mailer.meets_threshold("critical") is True
    assert mailer.meets_threshold("high") is True
    assert mailer.meets_threshold("medium") is False
    assert mailer.meets_threshold("informational") is False


def test_unknown_severity_never_emails():
    assert mailer.meets_threshold("banana") is False
    assert mailer.meets_threshold("") is False


def test_email_to_nobody_is_a_no_op():
    assert mailer.send([], "subject")["delivered"] is False


# ------------------------------------------------------------------ search
def test_search_falls_back_to_postgres_without_a_cluster():
    assert search_backend.backend == "postgresql"
    assert search_backend.available is False


def test_search_finds_a_planted_resource(db, employee):
    result = search_backend.search("payroll_master", db=db, indexes=[EVENTS_INDEX], limit=10)
    assert result["backend"] == "postgresql"
    assert result["total"] > 0
    assert any("payroll_master" in (r.get("title") or "") for r in result["results"])


def test_search_requires_a_query(db):
    assert search_backend.search("", db=db)["total"] == 0


def test_search_across_every_source_does_not_error(db, employee):
    result = search_backend.search("payroll", db=db, limit=5)
    assert result["total"] >= 0
    assert len(result["results"]) <= 5


def test_reindex_is_a_no_op_without_a_cluster(db):
    assert all(count == 0 for count in search_backend.reindex(db).values())
