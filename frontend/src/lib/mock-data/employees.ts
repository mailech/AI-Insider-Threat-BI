import { Employee } from "@/lib/types";

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "EMP-001",
    name: "Sarah Jenkins",
    department: "Engineering",
    designation: "Senior Developer",
    manager: "EMP-045",
    devicesCount: 3,
    accessLevel: "High",
  },
  {
    id: "EMP-002",
    name: "Michael Chen",
    department: "Finance",
    designation: "Financial Analyst",
    manager: "EMP-012",
    devicesCount: 2,
    accessLevel: "Medium",
  },
  {
    id: "EMP-003",
    name: "Elena Rodriguez",
    department: "HR",
    designation: "HR Manager",
    manager: "EMP-005",
    devicesCount: 1,
    accessLevel: "Low",
  },
  {
    id: "EMP-004",
    name: "David Kim",
    department: "IT",
    designation: "Systems Administrator",
    manager: "EMP-045",
    devicesCount: 4,
    accessLevel: "Critical",
  }
];
