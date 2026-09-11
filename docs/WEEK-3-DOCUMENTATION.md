## Week 3 – Authentication and Role-Based Access Control

### Objective

The objective of Week 3 was to implement secure user authentication and Role-Based Access Control (RBAC) for the Insider Threat Behavioral Intelligence System.

### Technologies Used

* Python
* FastAPI
* SQLite
* SQLAlchemy
* Passlib
* bcrypt
* JWT (JSON Web Token)
* Swagger UI

### Implementation

#### 1. User Registration

A user registration API was implemented using the `/users` endpoint. User details such as username, name, email, password, and role are stored in the database.

Passwords are not stored as plain text. They are securely converted into password hashes using **bcrypt** before being stored.

#### 2. User Login

A `/login` endpoint was implemented to authenticate users.

The system:

* Checks whether the username exists.
* Verifies the entered password against the stored password hash.
* Generates a JWT access token after successful authentication.
* Includes the user's username and role in the token.

#### 3. JWT Authentication

JWT-based authentication was implemented to protect API endpoints.

Users must provide a valid JWT token to access protected resources. Invalid or missing tokens are rejected by the authentication system.

#### 4. Role-Based Access Control

RBAC was implemented using user roles.

The main roles used in the system include:

* **Security Analyst**
* **Administrator**

Different API resources can be restricted according to the user's role.

#### 5. Protected User Endpoint

The `/users` endpoint was protected using JWT authentication.

Only authenticated users with a valid access token can access the user information.

#### 6. Administrator Endpoint

An `/admin` endpoint was created specifically for administrators.

If a Security Analyst attempts to access the endpoint, the system returns:

```text
403 Forbidden
```

An Administrator with a valid JWT token can successfully access the endpoint.

#### 7. Error Handling

Duplicate usernames or email addresses are handled using database integrity checking.

Instead of returning a server error, the API now returns:

```text
400 Bad Request
```

with the message:

```text
Username or email already exists
```

### Testing Results

| Test Case                        | Expected Result        | Status |
| -------------------------------- | ---------------------- | ------ |
| Valid login                      | Login successful + JWT | Passed |
| Invalid password                 | Invalid credentials    | Passed |
| Access `/users` without token    | 401 Unauthorized       | Passed |
| Access `/users` with valid token | 200 OK                 | Passed |
| Access `/admin` without token    | 401 Unauthorized       | Passed |
| Security Analyst → `/admin`      | 403 Forbidden          | Passed |
| Administrator → `/admin`         | 200 OK                 | Passed |
| Duplicate username               | 400 Bad Request        | Passed |

### Conclusion

Week 3 successfully implemented authentication and role-based authorization for the Insider Threat Behavioral Intelligence System. The system now supports secure password storage, JWT authentication, protected endpoints, administrator authorization, and appropriate error handling.
