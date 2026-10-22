/** HTML number inputs may write numbers into Vue models even when their initial value is a string. */
export function hasFormValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

export function formValueText(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}
