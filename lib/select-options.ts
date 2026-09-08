/**
 * Builds a `Select`-shaped options array from a list of `{ id, name }`
 * items, with a leading placeholder option (e.g. "All members") whose
 * value is the empty string — the "no filter selected" sentinel used
 * across the expenses/transfers filter panels.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export function toSelectOptions(
  items: { id: string; name: string }[] | undefined,
  allLabel: string,
): SelectOption[] {
  return [
    { value: "", label: allLabel },
    ...(items ?? []).map((item) => ({ value: item.id, label: item.name })),
  ];
}
