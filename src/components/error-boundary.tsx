"use client";

import { Component, type ReactNode } from "react";

// Keeps a failing widget (like chat) from taking the whole page down.
export class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Widget failed", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
