

export const APP_VERSION = '0.1.2'

export const CHANGELOG = [
  {
    version: '0.1.2',
    date: '2026-07-02',
    items: [
      'fixed drag-and-drop not working with touch on kanban cards, todos, and projects (was only working with a mouse)',
      'fixed the todo/board tab indicator flickering when adding a card',
    ],
  },
  {
    version: '0.1.1',
    date: '2026-07-02',
    items: [
      'settings: view source, clear all data, other apps by me',
      'fixed check-for-updates sometimes saying "latest version" even when an update was actually found',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-07-01',
    items: [
      'first version — projects with a todo list and a kanban board each',
      'drag to reorder todos and drag cards between kanban columns',
      'kanban columns resize based on how many cards are in them',
    ],
  },
]
