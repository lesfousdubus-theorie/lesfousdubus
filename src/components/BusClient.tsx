"use client";

import dynamic from "next/dynamic";
import { Component, type ErrorInfo, type ReactNode } from "react";
import BusLoadingScreen from "./BusLoadingScreen";

const BusExperience = dynamic(() => import("./BusExperience"), {
  ssr: false,
  loading: () => <BusLoadingScreen />,
});

class BusLoadingBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Le chargement du bus a échoué", error, info);
  }

  render() {
    return this.state.failed ? <BusLoadingScreen failed /> : this.props.children;
  }
}

export default function BusClient() {
  return <BusLoadingBoundary><BusExperience /></BusLoadingBoundary>;
}
