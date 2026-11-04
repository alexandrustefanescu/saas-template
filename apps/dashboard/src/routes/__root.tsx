import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  type NavigateOptions,
  type ToOptions,
} from "@tanstack/react-router";
import { ActionButtonContext } from "@react-spectrum/s2/ActionButton";
import { ButtonContext } from "@react-spectrum/s2/Button";
import { LinkContext } from "@react-spectrum/s2/Link";
import { LinkButtonContext } from "@react-spectrum/s2/LinkButton";
import { Provider } from "@react-spectrum/s2/Provider";
import { ToastContainer } from "@react-spectrum/s2/Toast";
import { ToggleButtonContext } from "@react-spectrum/s2/ToggleButton";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { ReactNode } from "react";
import type { RouterContext } from "#/router";

import "../styles.css";

declare module "@react-spectrum/s2/Provider" {
  interface RouterConfig {
    href: ToOptions;
    routerOptions: Omit<NavigateOptions, keyof ToOptions>;
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function SkeuomorphicButtons({ children }: { children: ReactNode }) {
  return (
    <ButtonContext value={{ UNSAFE_className: "skeuo-btn skeuo-btn--black" }}>
      <LinkButtonContext value={{ UNSAFE_className: "skeuo-btn skeuo-btn--white" }}>
        <ActionButtonContext value={{ UNSAFE_className: "skeuo-btn skeuo-btn--white" }}>
          <ToggleButtonContext value={{ UNSAFE_className: "skeuo-btn skeuo-btn--white" }}>
            {children}
          </ToggleButtonContext>
        </ActionButtonContext>
      </LinkButtonContext>
    </ButtonContext>
  );
}

function RootComponent() {
  const router = useRouter();

  return (
    <Provider
      background="base"
      colorScheme="light"
      locale="en-US"
      router={{
        navigate: (href: string | ToOptions, opts?: Omit<NavigateOptions, keyof ToOptions>) => {
          if (typeof href === "string") {
            return router.navigate({ href, ...opts });
          }
          return router.navigate({ ...href, ...opts });
        },
        useHref: (href: string | ToOptions) =>
          typeof href === "string" ? href : router.buildLocation(href).href,
      }}
    >
      <LinkContext value={{ variant: "secondary" }}>
        <SkeuomorphicButtons>
          <ToastContainer placement="bottom" />
          <Outlet />
          <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </SkeuomorphicButtons>
      </LinkContext>
    </Provider>
  );
}
