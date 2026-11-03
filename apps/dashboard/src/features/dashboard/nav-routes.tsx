import type { ComponentType, SVGProps } from "react";
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
    id: "settings",
    title: "Settings",
    icon: Settings,
    link: "/settings",
  },
];

export const sampleNotifications = [
  {
    id: "1",
    fallback: "OM",
    text: "New order received.",
    time: "10m ago",
  },
  {
    id: "2",
    fallback: "JL",
    text: "Server upgrade completed.",
    time: "1h ago",
  },
  {
    id: "3",
    fallback: "HH",
    text: "New user signed up.",
    time: "2h ago",
  },
];

export const teams = [
  { id: "1", name: "Alpha Inc.", plan: "Free" },
  { id: "2", name: "Beta Corp.", plan: "Free" },
  { id: "3", name: "Gamma Tech", plan: "Free" },
];
