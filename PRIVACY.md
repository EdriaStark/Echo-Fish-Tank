# Privacy

## Local-first by default

Article files are read and analyzed in the browser. The workspace is stored in that browser's IndexedDB. WriDNA does not send article text to an application server.

## Imports and exports

ZIP parsing loads JSZip from jsDelivr only when a user imports a ZIP. The ZIP contents remain in the browser. Reports and workspace backups are created only when the user selects an export action.

## What a user controls

- Remove individual articles or clear the workspace.
- Export a Markdown report.
- Export a complete JSON workspace backup.
- Restore an exported backup in a compatible browser.

## Current limitations

Browser storage can be cleared by the user, browser policy, or private browsing mode. Export a workspace backup for durable storage. A future cloud-sync feature must be opt-in, specify storage location, and never silently upload existing workspaces.
