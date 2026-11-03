import type { ReactNode } from "react";
import { useSelector } from "@tanstack/react-form";
import { Checkbox } from "@react-spectrum/s2/Checkbox";
import { useFieldContext } from "../form-context";
import { formatFieldErrors } from "../validators";

type Props = {
  children: ReactNode;
  value?: string;
  isRequired?: boolean;
  description?: ReactNode;
  "data-testid"?: string;
};

export function CheckboxField({
  children,
  value,
  isRequired,
  description,
  "data-testid": testId,
}: Props) {
  const field = useFieldContext<boolean>();
  const errors = useSelector(field.store, (state) => state.meta.errors);
  const isTouched = useSelector(field.store, (state) => state.meta.isTouched);
  const errorMessage = formatFieldErrors(errors);
  const showError = isTouched && errorMessage.length > 0;

  return (
    <Checkbox
      name={field.name}
      value={value}
      isRequired={isRequired}
      description={description}
      size="XL"
      isSelected={field.state.value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      isInvalid={showError}
      errorMessage={showError ? errorMessage : undefined}
      validationBehavior="aria"
      data-testid={testId}
    >
      {children}
    </Checkbox>
  );
}
