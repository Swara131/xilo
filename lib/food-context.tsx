"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { validateProfile } from "./validate-profile";
import { isFoodAnalysis, type FoodAnalysis, type UserProfile } from "./types";

const PROFILE_KEY = "food-inspector-profile";
const ANALYSIS_KEY = "food-inspector-analysis";

type Listener = () => void;

const listeners = new Set<Listener>();
let profileCache: UserProfile | null | undefined;
let analysisCache: FoodAnalysis | null | undefined;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function subscribeReady() {
  return () => {};
}

function readStoredProfile(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = validateProfile(JSON.parse(raw));
    return parsed.ok ? parsed.profile : null;
  } catch {
    sessionStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

function readStoredAnalysis(): FoodAnalysis | null {
  try {
    const raw = sessionStorage.getItem(ANALYSIS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isFoodAnalysis(parsed)) {
      sessionStorage.removeItem(ANALYSIS_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(ANALYSIS_KEY);
    return null;
  }
}

function getProfile() {
  if (profileCache === undefined) profileCache = readStoredProfile();
  return profileCache;
}

function getAnalysis() {
  if (analysisCache === undefined) analysisCache = readStoredAnalysis();
  return analysisCache;
}

function writeProfile(profile: UserProfile) {
  profileCache = profile;
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  emit();
}

function writeAnalysis(analysis: FoodAnalysis) {
  analysisCache = analysis;
  sessionStorage.setItem(ANALYSIS_KEY, JSON.stringify(analysis));
  emit();
}

function clearStoredAnalysis() {
  analysisCache = null;
  sessionStorage.removeItem(ANALYSIS_KEY);
  emit();
}

function resetStoredSession() {
  profileCache = null;
  analysisCache = null;
  sessionStorage.removeItem(PROFILE_KEY);
  sessionStorage.removeItem(ANALYSIS_KEY);
  emit();
}

interface FoodContextValue {
  ready: boolean;
  profile: UserProfile | null;
  analysis: FoodAnalysis | null;
  setProfile: (profile: UserProfile) => void;
  setAnalysis: (analysis: FoodAnalysis) => void;
  clearAnalysis: () => void;
  resetAll: () => void;
}

const FoodContext = createContext<FoodContextValue | null>(null);

export function FoodProvider({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const profile = useSyncExternalStore(subscribe, getProfile, () => null);
  const analysis = useSyncExternalStore(subscribe, getAnalysis, () => null);

  const value = useMemo<FoodContextValue>(
    () => ({
      ready,
      profile,
      analysis,
      setProfile: writeProfile,
      setAnalysis: writeAnalysis,
      clearAnalysis: clearStoredAnalysis,
      resetAll: resetStoredSession,
    }),
    [analysis, profile, ready],
  );

  return <FoodContext.Provider value={value}>{children}</FoodContext.Provider>;
}

export function useFoodSession() {
  const context = useContext(FoodContext);
  if (!context) throw new Error("useFoodSession must be used within FoodProvider");
  return context;
}
