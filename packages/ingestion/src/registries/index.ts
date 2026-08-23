import type { Ecosystem } from "@observatory/core";
import type { RegistryAdapter } from "./types";
import { npmAdapter } from "./npm";
import { pypiAdapter } from "./pypi";
import { nugetAdapter } from "./nuget";

const ADAPTERS: Record<Ecosystem, RegistryAdapter> = {
  npm: npmAdapter,
  pypi: pypiAdapter,
  nuget: nugetAdapter,
};

export function getRegistryAdapter(ecosystem: Ecosystem): RegistryAdapter {
  return ADAPTERS[ecosystem];
}

export { npmAdapter, mapNpm } from "./npm";
export { pypiAdapter, mapPypi, pickRepoUrl } from "./pypi";
export { nugetAdapter, parseNuspec, latestStable } from "./nuget";
export type { RegistryPackage, RegistryAdapter, FetchFn } from "./types";
