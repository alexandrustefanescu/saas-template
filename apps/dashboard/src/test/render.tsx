import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { Provider } from "@react-spectrum/s2/Provider";

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <Provider locale="en-US" colorScheme="light" background="base">
      {children}
    </Provider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: TestProviders, ...options });
}
