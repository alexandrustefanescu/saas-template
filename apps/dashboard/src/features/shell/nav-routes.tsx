import type { ComponentType, SVGProps } from "react";
import Collection from "@react-spectrum/s2/icons/Collection";
import Home from "@react-spectrum/s2/icons/Home";
import Settings from "@react-spectrum/s2/icons/Settings";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type NavSubRoute = {
  title: string;
  link: string;
  icon?: NavIcon;
};

export type NavRoute = {
  id: string;
  title: string;
  icon: NavIcon;
  link: string;
  subs?: NavSubRoute[];
};

export const dashboardRoutes: NavRoute[] = [
  {
    id: "home",
    title: "Home",
    icon: Home,
    link: "/",
  },
  {
    id: "items",
    title: "Items",
    icon: Collection,
    link: "/items",
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    link: "/settings",
  },
];
