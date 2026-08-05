import { User } from "@/lib/types";

export const MOCK_USERS: User[] = [
  {
    id: "U-1001",
    name: "Admin User",
    email: "admin@sentrix.local",
    role: "Administrator",
    status: "Active",
    lastLogin: new Date().toISOString(),
  },
  {
    id: "U-1002",
    name: "Analyst Bob",
    email: "bob@sentrix.local",
    role: "Security Analyst",
    status: "Active",
    lastLogin: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "U-1003",
    name: "Manager Alice",
    email: "alice@sentrix.local",
    role: "Security Manager",
    status: "Active",
    lastLogin: new Date(Date.now() - 43200000).toISOString(),
  }
];
