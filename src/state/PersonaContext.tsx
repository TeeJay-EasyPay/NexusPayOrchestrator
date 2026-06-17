import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { DEMO_PERSONAS, PersonaOption } from "../types/multiEntity";

const PERSONA_STORAGE_KEY = "nexuspay-selected-persona";

type PersonaContextType = {
  ready: boolean;
  personas: PersonaOption[];
  selectedPersona: PersonaOption;
  selectPersona: (personaId: string) => Promise<void>;
  resetPersona: () => Promise<void>;
};

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

function getDefaultPersona(): PersonaOption {
  return DEMO_PERSONAS[0];
}

function getPersonaById(personaId?: string | null): PersonaOption {
  if (!personaId) return getDefaultPersona();
  return DEMO_PERSONAS.find((p) => p.id === personaId) ?? getDefaultPersona();
}

async function loadPersonaId(): Promise<string | null> {
  return AsyncStorage.getItem(PERSONA_STORAGE_KEY);
}

export async function getStoredPersonaId(): Promise<string> {
  const personaId = await loadPersonaId();
  return getPersonaById(personaId).id;
}

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(getDefaultPersona().id);

  useEffect(() => {
    let mounted = true;

    loadPersonaId()
      .then((id) => {
        if (!mounted) return;
        const persona = getPersonaById(id);
        setSelectedPersonaId(persona.id);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<PersonaContextType>(
    () => ({
      ready,
      personas: DEMO_PERSONAS,
      selectedPersona: getPersonaById(selectedPersonaId),
      selectPersona: async (personaId: string) => {
        const persona = getPersonaById(personaId);
        setSelectedPersonaId(persona.id);
        await AsyncStorage.setItem(PERSONA_STORAGE_KEY, persona.id);
      },
      resetPersona: async () => {
        const fallback = getDefaultPersona();
        setSelectedPersonaId(fallback.id);
        await AsyncStorage.removeItem(PERSONA_STORAGE_KEY);
      },
    }),
    [ready, selectedPersonaId],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error("usePersona must be used within PersonaProvider");
  }
  return context;
}
