import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface ActiveSchool {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface SchoolContextValue {
  activeSchool: ActiveSchool | null;
  setActiveSchool: (school: ActiveSchool | null) => void;
  clearActiveSchool: () => void;
}

const SchoolContext = createContext<SchoolContextValue | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [activeSchool, setActiveSchoolState] = useState<ActiveSchool | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("activeSchool");
    if (stored) setActiveSchoolState(JSON.parse(stored));
  }, []);

  function setActiveSchool(school: ActiveSchool | null) {
    setActiveSchoolState(school);
    if (school) localStorage.setItem("activeSchool", JSON.stringify(school));
    else localStorage.removeItem("activeSchool");
  }

  function clearActiveSchool() {
    setActiveSchool(null);
  }

  return (
    <SchoolContext.Provider value={{ activeSchool, setActiveSchool, clearActiveSchool }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchoolContext() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error("useSchoolContext must be used within SchoolProvider");
  return ctx;
}
