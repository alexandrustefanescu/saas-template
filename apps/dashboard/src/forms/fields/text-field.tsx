import { useSelector } from "@tanstack/react-form";
import {
  TextField as SpectrumTextField,
  type TextFieldProps as SpectrumTextFieldProps,
} from "@react-spectrum/s2/TextField";
import { useFieldContext } from "../form-context";
import { formatFieldErrors } from "../validators";

type Props = {
  label: string;
  description?: string;
  placeholder?: string;
  type?: SpectrumTextFieldProps["type"];
  autoComplete?: string;
  "data-testid"?: string;
};

export function TextField({
  label,
  description,
  placeholder,
  type,
  autoComplete,
  "data-testid": testId,
}: Props) {
  const field = useFieldContext<string>();
  const errors = useSelector(field.store, (state) => state.meta.errors);
  const isTouched = useSelector(field.store, (state) => state.meta.isTouched);
  const isValidating = useSelector(field.store, (state) => state.meta.isValidating);

  const errorMessage = formatFieldErrors(errors);
  const showError = isTouched && errorMessage.length > 0;

  return (
    <SpectrumTextField
      label={label}
      name={field.name}
      type={type}
      size="L"
      autoComplete={autoComplete}
      placeholder={placeholder}
      data-testid={testId}
      description={isValidating ? "Checking…" : showError ? undefined : description}
      value={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      isInvalid={showError}
      errorMessage={showError ? errorMessage : undefined}
      validationBehavior="aria"
    />
  );
}
