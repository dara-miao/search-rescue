/** Battery is kept full. Speed never depends on charge. */
export function batterySpeedScale(_battery: number) {
  return 1
}

export function batteryBand(_battery: number): 'ok' {
  return 'ok'
}
