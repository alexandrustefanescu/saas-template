import type { FormProps } from "@react-spectrum/s2/Form";

type SpectrumStyles = NonNullable<FormProps["styles"]>;

/** Spectrum `styles` props only accept a subset of `style()` output. */
export function spectrumStyles(value: string): SpectrumStyles {
  return value as SpectrumStyles;
}
