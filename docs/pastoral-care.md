# Pastoral Care

## Confidentiality
- `Standard`: pastoral care team visibility
- `Restricted`: server-side limited visibility, intended for assigned leaders and elders
- `Elders-Only`: server-side visible to elders only by default

Restricted and elders-only reads are audit logged with action `view`.

## Endpoints
- `GET /api/care/options`
- `GET /api/care/cases`
- `POST /api/care/cases`
- `GET /api/care/notes`
- `POST /api/care/notes`
- `POST /api/care/notes/:noteId/promote`
- `POST /api/care/counseling-sessions`
- `POST /api/care/visitations`

## Notes model
- `CareCase` is the case container.
- `CareNote` is the detailed note/touchpoint layer.
- `CounselingSession` and `VisitationRecord` attach structured fields on top of a `CareNote`.
- A case inherits the highest confidentiality tier among its linked notes.

## Follow-up integration
- Visitation records with `followUpNeeded: true` and a `followUpDate` create a real pending action entry.

## UI coverage in this workspace
- Web admin page: `/care/notes`, `/care/cases`, `/care/counseling`, `/care/visitations`
- No Flutter project is present in this repository, so mobile screens were not added here.
