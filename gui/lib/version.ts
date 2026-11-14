import pkg from "../package.json";

/** Full semver from gui/package.json (e.g. "6.0.0"). */
export const APP_VERSION: string = pkg.version;

/** Major.minor version (e.g. "6.0"). */
export const APP_VERSION_SHORT: string = APP_VERSION.split(".").slice(0, 2).join(".");
