export interface CollabPreset {
  id: string;
  label?: string;
  name?: string;
  reasoning_model?: string;
  primary?: string;
  agents?: string[];
  lock_agents?: boolean;
  lock_reasoning?: boolean;
}

export interface CollabState {
  selectedPresetId: string;
  reasoningModelRequest: string;
  primaryModel: string;
  reasoningModelUI: string;
  collabAgents: string[];
  lockAgents: boolean;
  lockReasoning: boolean;
}

export const DEFAULT_COLLAB_STATE: CollabState = {
  selectedPresetId: 'default',
  reasoningModelRequest: 'claude',
  primaryModel: 'claude',
  reasoningModelUI: 'claude',
  collabAgents: ['grok', 'gemini'],
  lockAgents: true,
  lockReasoning: false,
};

export function applyPresetState(preset: CollabPreset): CollabState {
  const primaryModel = preset.primary ?? 'claude';
  return {
    selectedPresetId: preset.id,
    reasoningModelRequest: preset.reasoning_model ?? 'agent_collab',
    primaryModel,
    reasoningModelUI: primaryModel,
    collabAgents: [...(preset.agents ?? [])],
    lockAgents: !!preset.lock_agents,
    lockReasoning: !!preset.lock_reasoning,
  };
}

export function buildCollabPayload(collabState: CollabState | null, selectedModel: string) {
  if (!collabState) {
    // Solo explicit family selection — one model, no collaborators, unambiguous
    return {
      collaboration_mode: 'custom' as const,
      reasoning_model: selectedModel,
      collab_agents: [] as string[],
    };
  }

  if (collabState.selectedPresetId === 'default') {
    // Default fixed preset — Claude synthesizes, Grok + Gemini gather
    // Backend must preserve chosen families; may optimize within each family
    return {
      collaboration_mode: 'default' as const,
      reasoning_model: collabState.primaryModel || 'claude',
      collab_agents: collabState.collabAgents,
    };
  }

  if (collabState.selectedPresetId === 'auto') {
    // Auto preset — backend/router picks provider families dynamically per prompt
    return {
      collaboration_mode: 'auto' as const,
      reasoning_model: collabState.primaryModel || 'claude',
      collab_agents: [] as string[],
    };
  }

  if (collabState.selectedPresetId === 'full_collab') {
    // Full collaboration — all agents reason independently, synthesis model combines
    return {
      collaboration_mode: 'full' as const,
      reasoning_model: collabState.primaryModel || 'claude',
      collab_agents: collabState.collabAgents,
    };
  }

  // Custom collaboration — exact user checkbox selections preserved, no pruning
  return {
    collaboration_mode: 'custom' as const,
    reasoning_model: collabState.primaryModel || 'claude',
    collab_agents: collabState.collabAgents,
  };
}

export function shouldKeepCollaboratorsOnReasoningChange(collabState: CollabState | null) {
  return !!collabState?.lockAgents;
}
