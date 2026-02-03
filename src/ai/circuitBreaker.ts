type CircuitState = {
  failures: number;
  openUntil: number;
};

const circuits = new Map<string, CircuitState>();

export const isCircuitOpen = (key: string) => {
  const state = circuits.get(key);
  if (!state) return false;
  if (Date.now() > state.openUntil) {
    circuits.delete(key);
    return false;
  }
  return state.openUntil > Date.now();
};

export const recordFailure = (
  key: string,
  threshold: number,
  cooldownMs: number,
) => {
  const state = circuits.get(key) ?? { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= threshold) {
    state.openUntil = Date.now() + cooldownMs;
    state.failures = 0;
  }
  circuits.set(key, state);
};

export const recordSuccess = (key: string) => {
  circuits.delete(key);
};
