"use client";

import { useState } from "react";
import { NativeSelect } from "@/components/company/native-select";
import { SearchInput } from "@/components/common/search-input";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useEmployee, useEmployees } from "@/hooks/use-employees";

/** "Everyone I may see" — the API applies the caller's scope. */
export const ALL_PEOPLE = "";

/** Matches shown per search; searching narrows it, so company size doesn't matter. */
const SEARCH_LIMIT = 50;

/**
 * Whose attendance to show. Admin/HR search the whole company on the server;
 * anyone else chooses between themselves and their direct reports.
 */
export function HistoryEmployeePicker({
  privileged,
  meEmployeeId,
  value,
  onChange,
}: {
  privileged: boolean;
  meEmployeeId?: string;
  value: string;
  onChange: (employeeId: string) => void;
}) {
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const setSearchDebounced = useDebouncedCallback(setSearch, 300);
  // Admin/HR: server-side search. Others: the directory filtered to their reports.
  const { data: matches } = useEmployees(privileged ? { search: search || undefined, limit: SEARCH_LIMIT } : { limit: 100 });
  // Keep the selected person listed even when the search no longer matches them.
  const { data: selected } = useEmployee(privileged && value ? value : undefined);

  const options = privileged
    ? matches?.employees ?? []
    : (matches?.employees ?? []).filter((e) => e.id === meEmployeeId || e.reportingManagerId === meEmployeeId);
  const hasReports = options.some((e) => e.id !== meEmployeeId);
  if (!privileged && !hasReports) return null; // only their own history: nothing to choose

  const list = selected && !options.some((e) => e.id === selected.id) ? [selected, ...options] : options;

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      {privileged && (
        <SearchInput className="max-w-none sm:w-56" placeholder="Search people…"
          value={text}
          onChange={(v) => {
            setText(v);
            setSearchDebounced(v.trim());
          }}
        />
      )}
      <NativeSelect aria-label="Employee" className="w-full sm:w-56" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL_PEOPLE}>{privileged ? "Everyone" : "Me and my team"}</option>
        {list.map((e) => (
          <option key={e.id} value={e.id}>
            {e.id === meEmployeeId ? `${e.fullName} (me)` : e.fullName}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
