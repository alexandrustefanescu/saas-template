import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "./form-context";
import { TextField } from "./fields/text-field";
import { CheckboxField } from "./fields/checkbox-field";
import { SubmitButton } from "./form-components/submit-button";

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    CheckboxField,
  },
  formComponents: {
    SubmitButton,
  },
});
