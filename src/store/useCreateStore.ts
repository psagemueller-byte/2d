'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RoomStyleId, RoomTypeId, GenerationStep } from '@/types';

interface CreateStore {
  // Upload
  previewUrl: string | null;

  // Configuration
  selectedStyle: RoomStyleId | null;
  selectedRoomType: RoomTypeId | null;

  // Analysis
  analysisResult: string | null;

  // Payment
  stripeSessionId: string | null;

  // Generation
  generationStatus: GenerationStep;
  resultImageUrl: string | null;
  errorMessage: string | null;

  // Step tracking
  currentStep: 1 | 2 | 3 | 4;

  // Actions
  setPreviewUrl: (url: string) => void;
  setSelectedStyle: (style: RoomStyleId) => void;
  setSelectedRoomType: (type: RoomTypeId) => void;
  setAnalysisResult: (result: string) => void;
  setStripeSessionId: (id: string) => void;
  setGenerationStatus: (status: GenerationStep) => void;
  setResultImageUrl: (url: string) => void;
  setError: (message: string) => void;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  reset: () => void;
}

const initialState = {
  previewUrl: null,
  selectedStyle: null,
  selectedRoomType: null,
  analysisResult: null,
  stripeSessionId: null,
  generationStatus: 'idle' as GenerationStep,
  resultImageUrl: null,
  errorMessage: null,
  currentStep: 1 as const,
};

export const useCreateStore = create<CreateStore>()(
  persist(
    (set) => ({
      ...initialState,

      setPreviewUrl: (url) => set({ previewUrl: url, currentStep: 2, errorMessage: null }),
      setSelectedStyle: (style) => set({ selectedStyle: style }),
      setSelectedRoomType: (type) => set({ selectedRoomType: type }),
      setAnalysisResult: (result) => set({ analysisResult: result }),
      setStripeSessionId: (id) => set({ stripeSessionId: id }),
      setGenerationStatus: (status) => set({ generationStatus: status }),
      setResultImageUrl: (url) =>
        set({ resultImageUrl: url, generationStatus: 'completed', currentStep: 4 }),
      setError: (message) => set({ errorMessage: message, generationStatus: 'failed' }),
      setCurrentStep: (step) => set({ currentStep: step }),
      reset: () => set(initialState),
    }),
    {
      name: 'roomvision-create',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? sessionStorage : ({
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        })
      ),
      partialize: (state) => ({
        previewUrl: state.previewUrl,
        selectedStyle: state.selectedStyle,
        selectedRoomType: state.selectedRoomType,
        analysisResult: state.analysisResult,
        currentStep: state.currentStep,
        stripeSessionId: state.stripeSessionId,
      }),
    }
  )
);
