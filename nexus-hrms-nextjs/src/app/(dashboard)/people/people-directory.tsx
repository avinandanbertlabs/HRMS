"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, Users } from "lucide-react";
import { Page, PageHeading } from "@/components/ui/page";

type Person = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  totalLeaveTaken: number;
  team: { id: string; name: string } | null;
  department: { name: string } | null;
  designation: { title: string } | null;
};

export default function PeopleDirectory() {
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/v1/employees?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load your team directory.");
      setPeople(result.data as Person[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your team directory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(query); }, [load, query]);

  return <Page>
    <PageHeading eyebrow="MY TEAM" title="Team directory" subtitle="Search employee names and open profiles within the teams you lead." action={<button className="button-secondary" onClick={() => void load(query)}><RefreshCw size={15} /> Refresh</button>} />
    {error && <div className="notice" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
    <section className="panel panel-pad">
      <div className="panel-head"><div><div className="section-title">People in your scope</div><div className="section-note">Contact and organization details are visible only for your assigned teams.</div></div><Users size={18} color="var(--cyan)" /></div>
      <div className="toolbar"><div className="search-field"><Search size={15} className="search-icon" /><input className="field" placeholder="Search employee name, employee number or email…" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
      {loading ? <div className="empty-state">Searching your team…</div> : <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Employee number</th><th>Team</th><th>Department</th><th>Designation</th><th>Total leave taken</th></tr></thead><tbody>{people.map((person) => <tr key={person.id}><td><Link href={`/profile?employeeId=${encodeURIComponent(person.id)}`} className="person-name">{person.firstName} {person.lastName}</Link><div className="person-sub">{person.email}</div></td><td>{person.employeeCode}</td><td>{person.team?.name ?? "Unassigned"}</td><td>{person.department?.name ?? "Not assigned"}</td><td>{person.designation?.title ?? "Not assigned"}</td><td>{person.totalLeaveTaken} days</td></tr>)}</tbody></table>{!people.length && <div className="empty-state">{query ? "No matching profiles in your team." : "No employee profiles are assigned to teams you lead."}</div>}</div>}
    </section>
  </Page>;
}
