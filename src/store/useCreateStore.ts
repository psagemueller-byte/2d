'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RoomStyleId, RoomTypeId, GenerationStep, GeneratedView, DetectedRoom, RoomResult } from '@/types';

interface CreateStore {
  // Upload
  previewUrl: string | null;

  // Room Detection
  detectedRooms: DetectedRoom[];
  isDetecting: boolean;
  detectionError: string | null;

  // Configuration (legacy single-room fields kept for backward compat)
  selectedStyle: RoomStyleId | null;
  selectedRoomType: RoomTypeId | null;

  // Analysis
  analysisResult: string | null;

  // Payment
  stripeSessionId: string | null;

  // Generation
  generationStatus: GenerationStep;
  resultViews: GeneratedView[];
  roomResults: RoomResult[];
  errorMessage: string | null;

  // Step tracking (1=Upload, 2=RoomDetection, 3=Payment, 4=Result)
  currentStep: 1 | 2 | 3 | 4;

  // Actions — Upload
  setPreviewUrl: (url: string) => void;

  // Actions — Room Detection
  setDetectedRooms: (rooms: DetectedRoom[]) => void;
  setIsDetecting: (value: boolean) => void;
  setDetectionError: (error: string | null) => void;
  toggleRoomSelection: (roomId: string) => void;
  selectAllRooms: () => void;
  deselectAllRooms: () => void;
  setRoomStyle: (roomId: string, style: RoomStyleId) => void;
  setAllRoomsStyle: (style: RoomStyleId) => void;

  // Actions — Legacy
  setSelectedStyle: (style: RoomStyleId) => void;
  setSelectedRoomType: (type: RoomTypeId) => void;
  setAnalysisResult: (result: string) => void;
  setStripeSessionId: (id: string) => void;

  // Actions — Generation
  setGenerationStatus: (status: GenerationStep) => void;
  addResultView: (view: GeneratedView) => void;
  addRoomResult: (result: RoomResult) => void;
  setCompleted: () => void;
  setError: (message: string) => void;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  reset: () => void;

  // Computed helpers
  getSelectedRooms: () => DetectedRoom[];
  getSelectedRoomCount: () => number;
}

const initialState = {
  previewUrl: null,
  detectedRooms: [] as DetectedRoom[],
  isDetecting: false,
  detectionError: null,
  selectedStyle: null,
  selectedRoomType: null,
  analysisResult: null,
  stripeSessionId: null,
  generationStatus: 'idle' as GenerationStep,
  resultViews: [] as GeneratedView[],
  roomResults: [] as RoomResult[],
  errorMessage: null,
  currentStep: 1 as const,
};

export const useCreateStore = create<CreateStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Upload
      setPreviewUrl: (url) => set({ previewUrl: url, currentStep: 1, errorMessage: null }),

      // Room Detection
      setDetectedRooms: (rooms) => set({
        detectedRooms: rooms.map((r) => ({ ...r, selected: true, selectedStyle: undefined })),
        currentStep: 2,
        detectionError: null,
      }),
      setIsDetecting: (value) => set({ isDetecting: value }),
      setDetectionError: (error) => set({ detectionError: error, isDetecting: false }),
      toggleRoomSelection: (roomId) =>
        set((state) => ({
          detectedRooms: state.detectedRooms.map((r) =>
            r.id === roomId ? { ...r, selected: !r.selected } : r
          ),
        })),
      selectAllRooms: () =>
        set((state) => ({
          detectedRooms: state.detectedRooms.map((r) => ({ ...r, selected: true })),
        })),
      deselectAllRooms: () =>
        set((state) => ({
          detectedRooms: state.detectedRooms.map((r) => ({ ...r, selected: false })),
        })),
      setRoomStyle: (roomId, style) =>
        set((state) => ({
          detectedRooms: state.detectedRooms.map((r) =>
            r.id === roomId ? { ...r, selectedStyle: style } : r
          ),
        })),
      setAllRoomsStyle: (style) =>
        set((state) => ({
          detectedRooms: state.detectedRooms.map((r) => ({ ...r, selectedStyle: style })),
        })),

      // Legacy
      setSelectedStyle: (style) => set({ selectedStyle: style }),
      setSelectedRoomType: (type) => set({ selectedRoomType: type }),
      setAnalysisResult: (result) => set({ analysisResult: result }),
      setStripeSessionId: (id) => set({ stripeSessionId: id }),

      // Generation
      setGenerationStatus: (status) => set({ generationStatus: status }),
      addResultView: (view) =>
        set((state) => ({ resultViews: [...state.resultViews, view] })),
      addRoomResult: (result) =>
        set((state) => ({ roomResults: [...state.roomResults, result] })),
      setCompleted: () =>
        set({ generationStatus: 'completed', currentStep: 4 }),
      setError: (message) => set({ errorMessage: message, generationStatus: 'failed' }),
      setCurrentStep: (step) => set({ currentStep: step }),
      reset: () => set(initialState),

      // Computed helpers
      getSelectedRooms: () => get().detectedRooms.filter((r) => r.selected),
      getSelectedRoomCount: () => get().detectedRooms.filter((r) => r.selected).length,
    }),
    {
      name: 'roomvision-create',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
        return {
          getItem: (name: string) => {
            try { return sessionStorage.getItem(name); }
            catch { return null; }
          },
          setItem: (name: string, value: string) => {
            try { sessionStorage.setItem(name, value); }
            catch { /* QuotaExceededError — ignore silently */ }
          },
          removeItem: (name: string) => {
            try { sessionStorage.removeItem(name); }
            catch { /* ignore */ }
          },
        };
      }),
      partialize: (state) => ({
        // Do NOT persist previewUrl (multi-MB data URL) or detectedRooms (large geometry)
        // These exceed sessionStorage limits. User re-uploads on refresh.
        selectedStyle: state.selectedStyle,
        selectedRoomType: state.selectedRoomType,
        analysisResult: state.analysisResult,
        currentStep: state.currentStep,
        stripeSessionId: state.stripeSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // If step >= 2 but no rooms (not persisted), reset to step 1
        if (state.currentStep >= 2 && state.detectedRooms.length === 0) {
          state.currentStep = 1;
        }
      },
    }
  )
);
