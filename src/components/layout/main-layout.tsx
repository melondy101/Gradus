"use client";

import React from "react";

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  contextPanel?: React.ReactNode;
}

export function MainLayout({
  sidebar,
  children,
  contextPanel,
}: MainLayoutProps) {
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "var(--background)",
        fontFamily: "var(--font-dm-sans), DM Sans, system-ui, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Sidebar / IconRail */}
      {sidebar}

      {/* Main Content Viewport */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
          background: "var(--background)",
        }}
      >
        {children}
      </main>

      {/* Context Inspector Panel */}
      {contextPanel}
    </div>
  );
}
