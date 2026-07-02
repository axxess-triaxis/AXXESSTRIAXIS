"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import type { NavSection } from "../navigation";
import { routeForPath, routeForSection } from "./routes";

export function useAppRouting(defaultSection: NavSection = "dashboard") {
  const pathname = usePathname();
  const router = useRouter();
  const activeRoute = pathname ? routeForPath(pathname) : routeForSection(defaultSection);
  const active = activeRoute.section;

  const navigateToSection = (section: NavSection) => {
    const route = routeForSection(section);
    router.push(`/${route.path}` as Route);
  };

  return { active, activeRoute, navigateToSection };
}
