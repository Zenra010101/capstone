"use client";

import { createContext, useContext, useEffect, useState } from "react";

type SidebarContextValue = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = "gensanpos-sidebar-collapsed";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
      else if (stored === null && typeof window !== "undefined") {
        const w = window.innerWidth;
        if (w >= 1024 && w < 1536) setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const laptop = window.matchMedia("(max-width: 1535px)");

    const onChange = () => {
      if (desktop.matches) setMobileOpen(false);
      try {
        if (localStorage.getItem(STORAGE_KEY) !== null) return;
        if (desktop.matches && laptop.matches) setCollapsed(true);
        if (desktop.matches && !laptop.matches) setCollapsed(false);
      } catch {
        /* ignore */
      }
    };
    onChange();
    desktop.addEventListener("change", onChange);
    laptop.addEventListener("change", onChange);
    return () => {
      desktop.removeEventListener("change", onChange);
      laptop.removeEventListener("change", onChange);
    };
  }, []);

  const setCollapsedPersist = (v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed: setCollapsedPersist,
        toggle: () => setCollapsedPersist(!collapsed),
        mobileOpen,
        setMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
