/**
 * Host half of dsh-recent-sessions.
 *
 * The feature is browser-only: the Client module registers the sidebar entry,
 * the "Recent Sessions" panel and the per-row favorite button, and reads
 * sessions, statuses and workspaces through the framework's global standard
 * hooks. This row exists so the bundle has a Host entry that the Loader can
 * mount and the Plugin Manager can list.
 */
export function apply() {}
