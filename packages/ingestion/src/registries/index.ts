import type { Ecosystem } from "@observatory/core";
import type { RegistryAdapter } from "./types";
import { npmAdapter } from "./npm";
import { pypiAdapter } from "./pypi";

const ADAPTERS: Record<Ecosystem, RegistryAdapter> = {
  npm: npmAdapter,
  pypi: pypiAdapter,
};

export function getRegistryAdapter(ecosystem: Ecosystem): RegistryAdapter {
  return ADAPTERS[ecosystem];
}

export { npmAdapter, mapNpm } from "./npm";
export { pypiAdapter, mapPypi, pickRepoUrl } from "./pypi";
export type { RegistryPackage, RegistryAdapter, FetchFn } from "./types";
