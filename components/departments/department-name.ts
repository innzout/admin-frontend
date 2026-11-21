import { requiredText } from "@/lib/validation";

/** Shared by the add form and in-place rename so both enforce the same rule. */
export const DEPARTMENT_NAME_MAX = 100;
export const departmentNameSchema = requiredText("Department name", DEPARTMENT_NAME_MAX);
