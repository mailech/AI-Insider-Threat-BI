\# AI Insider Threat Behavioral Intelligence System



\## About the Project



The AI Insider Threat Behavioral Intelligence System is a web-based security application developed to monitor employee activities and identify users who may show risky or unusual behavior.



The project collects different types of employee activity such as logon, email, file, HTTP and device activities. This information is used to understand employee behavior and calculate risk levels.



The main purpose of the project is to help a security analyst quickly identify high-risk employees and investigate their activities from a single dashboard.



\## What the System Does



The application currently includes:



\- Employee management

\- Employee risk analysis

\- Security alerts

\- Logon activity monitoring

\- Email activity monitoring

\- File activity monitoring

\- HTTP activity monitoring

\- Device activity monitoring

\- Psychometric profile information

\- Dashboard summaries

\- Authentication and protected routes

\- Machine-learning based risk analysis



\## Technology Used



\### Backend



\- Python

\- FastAPI

\- SQLAlchemy

\- PostgreSQL

\- JWT Authentication



\### Frontend



\- React

\- Vite

\- JavaScript

\- CSS



\### Machine Learning



The project contains a machine-learning based risk analysis component.



The current ML artifacts include:



\- Isolation Forest model

\- Feature scaler

\- Feature column configuration

\- Risk calibration configuration

\- Risk results



\## How the System Works



The general flow of the application is:



```text

Employee Activity

&#x20;      |

&#x20;      v

PostgreSQL Database

&#x20;      |

&#x20;      v

Backend APIs

&#x20;      |

&#x20;      v

Behavior / Risk Analysis

&#x20;      |

&#x20;      v

Risk \& Alert Information

&#x20;      |

&#x20;      v

React Dashboard

&#x20;      |

&#x20;      v

Security Analyst

