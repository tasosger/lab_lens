/** Deliberately unsorted, with ties, zero, a negative output, and missing properties. */
export function experimentFixture() {
  return {
    EXP_C: {
      inputs: { Additive: 0, 'Oven Temperature': 375, Shared: 8 },
      outputs: { Strength: 10, 'Cure Time': 3, Shared: 100 },
    },
    EXP_A: {
      inputs: { Additive: 2, 'Oven Temperature': 425 },
      outputs: { Strength: 2, 'Cure Time': 5 },
    },
    EXP_B: {
      inputs: { Additive: 1 },
      outputs: { Strength: 10, 'Cure Time': 4, 'Later Property': 7 },
    },
    EXP_D: { inputs: { Additive: 0 }, outputs: { 'Cure Time': 0 } },
    EXP_E: { inputs: {}, outputs: { Strength: -2 } },
  }
}
