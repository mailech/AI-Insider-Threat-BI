import { User } from "@/lib/types";

export const MOCK_USERS: User[] = [
  {
    id: "U-1001",
    name: "Admin User",
    email: "admin@insideriq.local",
    role: "Administrator",
    status: "Active",
    lastLogin: new Date().toISOString(),
  },
  {
    id: "U-1002",
    name: "Analyst Bob",
    email: "analyst@insideriq.local",
    role: "Security Analyst",
    status: "Active",
    lastLogin: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "U-1003",
    name: "Manager Alice",
    email: "manager@insideriq.local",
    role: "Security Manager",
    status: "Active",
    lastLogin: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: "U-1004",
    name: "Engineer Charlie",
    email: "engineer@insideriq.local",
    role: "SOC Engineer",
    status: "Active",
    lastLogin: new Date(Date.now() - 12000000).toISOString(),
  }
];
