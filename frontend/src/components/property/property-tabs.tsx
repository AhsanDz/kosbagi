"use client";

import { useState, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_PROPERTY_TAB,
  parsePropertyTab,
  propertyTabs,
  type PropertyTab,
} from "@/lib/property-tabs";

interface PropertyTabsProps {
  /** Tab awal, dibaca server dari ?tab= di URL. */
  initialTab: PropertyTab;
  /** Isi tiap tab, dirender di server lalu dikirim sebagai props. */
  panels: Record<PropertyTab, ReactNode>;
}

/**
 * Tab detail kos (Figma: komponen "Tab", varian garis). Saat tab diganti,
 * URL ikut diperbarui lewat history.replaceState (tanpa memuat ulang halaman),
 * jadi alamat seperti ?tab=keuangan bisa disalin dan dibagikan.
 */
export function PropertyTabs({ initialTab, panels }: PropertyTabsProps) {
  const [tab, setTab] = useState<PropertyTab>(initialTab);

  function handleValueChange(value: string) {
    const next = parsePropertyTab(value);
    setTab(next);
    const url = new URL(window.location.href);
    if (next === DEFAULT_PROPERTY_TAB) url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <Tabs value={tab} onValueChange={handleValueChange} className="gap-10">
      <TabsList variant="line" aria-label="Informasi kos">
        {propertyTabs.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {propertyTabs.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {panels[item.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
