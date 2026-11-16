/**
 * Version and commit of this build, injected by Vite at build time (vite.config.ts).
 * Shown discreetly in the menu so a deployed web version can be identified.
 */
declare const __EMPIRES_VERSION__: string;
declare const __EMPIRES_COMMIT__: string;
declare const __EMPIRES_BUILD_DATE__: string;

export interface BuildInfo {
  version: string;
  commit: string;
  date: string;
}

export const BUILD_INFO: BuildInfo = {
  version: typeof __EMPIRES_VERSION__ === 'string' ? __EMPIRES_VERSION__ : '0.0.0-dev',
  commit: typeof __EMPIRES_COMMIT__ === 'string' ? __EMPIRES_COMMIT__ : 'dev',
  date: typeof __EMPIRES_BUILD_DATE__ === 'string' ? __EMPIRES_BUILD_DATE__ : '',
};
