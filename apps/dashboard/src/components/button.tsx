import { Button as SpectrumButton, type ButtonProps } from "@react-spectrum/s2/Button";

export function Button({ variant = "primary", ...props }: ButtonProps) {
  const finish =
    variant === "secondary"
      ? "skeuo-btn--white"
      : variant === "negative"
        ? "skeuo-btn--negative"
        : "skeuo-btn--black";

  return <SpectrumButton {...props} variant={variant} UNSAFE_className={`skeuo-btn ${finish}`} />;
}
