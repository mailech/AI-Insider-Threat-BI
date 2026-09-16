# auth.py - JWT creation/verification and the RBAC enforcement decorator.
#
# This is the direct fix for the security finding: "several sensitive API endpoints do
# not appear to enforce role-based authorization... a valid login may be enough to
# perform actions that should be restricted to specific roles."
#
# require_role(*roles) below checks the ROLE CLAIM INSIDE THE VERIFIED JWT on every
# sensitive route, server-side, before the request handler ever runs. A valid token
# alone is no longer enough - the token's role must also be in the route's allow-list.

import datetime
import os
from functools import wraps

import jwt
from flask import request, jsonify

# In Docker/production this comes from the SECRET_KEY environment variable (see .env.example).
# The fallback below only exists so `python app.py` still works with zero setup for local dev -
# it is intentionally obvious/unsafe so nobody mistakes it for a real production secret.
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret-do-not-use-in-production-6f2b9c1a")
ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 8


def create_token(user):
    """user: dict with id, name, email, role, employee_id (employee_id may be None)."""
    now = datetime.datetime.utcnow()
    payload = {
        "sub": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "employee_id": user.get("employee_id"),
        "iat": now,
        "exp": now + datetime.timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _get_bearer_token():
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:].strip()
    return None


def require_role(*roles):
    """
    Route decorator. With no roles given, only checks that the JWT is present and valid
    (i.e. "any authenticated user"). With roles given, the decoded token's role MUST be
    one of them, or the request is rejected with 403 - enforced here, server-side, not
    left to the frontend to hide a button.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            token = _get_bearer_token()
            if not token:
                return jsonify({"error": "Missing authentication token."}), 401
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Session expired, please log in again."}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid authentication token."}), 401

            request.user = payload  # available to the route handler as request.user

            if roles and payload.get("role") not in roles:
                # import here to avoid a circular import with app.py
                from db import log_audit
                log_audit(payload, "ACCESS_DENIED", fn.__name__,
                          f"role '{payload.get('role')}' is not in allowed roles {roles}")
                return jsonify({
                    "error": f"Your role ('{payload.get('role')}') is not authorized for this action.",
                    "required_roles": list(roles),
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


# "any authenticated user, any role" - still requires a valid JWT, just no specific role
require_auth = require_role()
