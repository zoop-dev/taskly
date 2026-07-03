

import './style.css'
import '@material/web/icon/icon.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/filled-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/button/text-button.js'
import '@material/web/fab/fab.js'
import '@material/web/dialog/dialog.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'
import { initInstallGate } from 'zoop-kit/install-gate.js'
import { attachBootLoader, removeBootLoaderImmediately } from 'zoop-kit/boot-loader.js'
import { pushOverlay, popOverlay } from 'zoop-kit/back-nav.js'
import { zkConfirm, zkPrompt } from 'zoop-kit/dialogs.js'
import { showToast } from 'zoop-kit/toast.js'
import { initUpdateCheck, checkForUpdate } from 'zoop-kit/update-check.js'
import { maybeShowChangelog, showFullChangelog } from 'zoop-kit/changelog.js'
import { initDesktopWarning } from 'zoop-kit/desktop-warning.js'
import { initSavedTheme, showThemePicker } from 'zoop-kit/theme-picker.js'
import { showAppSwitcher } from 'zoop-kit/app-switcher.js'
import { APP_VERSION, CHANGELOG } from './changelog.js'

const BOARDS_KEY = 'taskly:boards'
const VERSION_KEY = 'taskly:version'
const THEME_KEY = 'taskly:theme'




const DRAG_HANDLE_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="9" cy="7" r="2"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="17" r="2"/><circle cx="15" cy="17" r="2"/></svg>`

const THEMES = {
  purple: { accent: '#b28dff', accentOn: '#1a1023', grad: '#150a2e 0%, #2c1359 55%, #6a2fd0 100%' },
  blue: { accent: '#4cc9ff', accentOn: '#04121c', grad: '#0a1330 0%, #123a63 55%, #1c6fd0 100%' },
  green: { accent: '#2be675', accentOn: '#05170d', grad: '#06170f 0%, #0d3324 55%, #1ed760 100%' },
  orange: { accent: '#ff9f5a', accentOn: '#231202', grad: '#2a1205 0%, #4a2107 55%, #d0631c 100%' },
  pink: { accent: '#ff6ad5', accentOn: '#26041b', grad: '#1f0518 0%, #430e34 55%, #c22e93 100%' },
}

let currentThemeKey = initSavedTheme(THEME_KEY, THEMES, 'purple')

const COLUMNS = [
  { key: 'todo', label: 'To do', color: '#8ec9ff' },
  { key: 'progress', label: 'In progress', color: '#ffd76a' },
  { key: 'done', label: 'Done', color: '#5ee0a0' },
]

const BOARD_COLORS = ['#b28dff', '#8ec9ff', '#5ee0a0', '#ffd76a', '#ff9f5a', '#ff6ad5']

if (
  initInstallGate({
    appName: 'Taskly',
    icon: 'checklist',
    subtitle: 'a todo list and kanban board for your own stuff. works offline, full screen, no permissions needed.',
  })
) {
  removeBootLoaderImmediately()
} else {
  attachBootLoader(() => {
    renderApp()
    initDesktopWarning('taskly:desktop-warning-dismissed')
    initUpdateCheck()
    maybeShowChangelog({
      appVersion: APP_VERSION,
      changelog: CHANGELOG,
      versionKey: VERSION_KEY,
      isFirstRun: loadBoards().length === 0,
    })
  })
}

function uid() {
  return crypto.randomUUID()
}





function positionSegmentedThumb(container, instant = true) {
  if (!container) return
  const thumb = container.querySelector('.segmented-thumb')
  const active = container.querySelector('button.active')
  if (!thumb || !active) return

  if (instant) thumb.style.transition = 'none'
  thumb.style.width = `${active.offsetWidth}px`
  thumb.style.transform = `translateX(${active.offsetLeft - 3}px)`
  if (instant) {
    thumb.offsetWidth 
    thumb.style.transition = ''
  }
}


function loadBoards() {
  try {
    return JSON.parse(localStorage.getItem(BOARDS_KEY)) || []
  } catch {
    return []
  }
}
function saveBoards(list) {
  localStorage.setItem(BOARDS_KEY, JSON.stringify(list))
}

function emptyColumns() {
  return { todo: [], progress: [], done: [] }
}


function renderApp() {
  const app = document.querySelector('#app')
  app.innerHTML = `
    <div class="topbar"><p class="topbar-title">Projects</p></div>
    <div style="padding:0 18px;">
      <div id="boards-list"></div>
      <button type="button" class="add-btn" id="new-board-btn" style="margin-top:8px;">
        <md-icon>add</md-icon> New project
      </button>
    </div>

    <md-dialog id="new-board-dialog">
      <div slot="headline">New project</div>
      <div slot="content">
        <div class="todo-add-row" style="margin-bottom:0;">
          <md-icon>edit</md-icon>
          <input id="new-board-input" type="text" placeholder="Project name…" autocomplete="off" />
        </div>
      </div>
      <div slot="actions">
        <md-text-button id="new-board-cancel">Cancel</md-text-button>
        <md-text-button id="new-board-create">Create</md-text-button>
      </div>
    </md-dialog>

    <md-fab id="settings-fab" class="settings-fab" aria-label="Settings">
      <md-icon slot="icon">settings</md-icon>
    </md-fab>

    <md-dialog id="settings-dialog" class="settings-dialog">
      <div slot="headline">Settings</div>
      <div slot="content">
        <md-list>
          <md-list-item type="button" id="settings-check-update">
            <md-icon slot="start">refresh</md-icon>
            <div slot="headline">Check for updates</div>
            <div slot="supporting-text">v${APP_VERSION}</div>
          </md-list-item>
          <md-list-item type="button" id="settings-changelog">
            <md-icon slot="start">campaign</md-icon>
            <div slot="headline">Changelog</div>
          </md-list-item>
          <md-list-item type="button" id="settings-theme">
            <md-icon slot="start">palette</md-icon>
            <div slot="headline">Theme</div>
            <div slot="supporting-text">${currentThemeKey}</div>
          </md-list-item>
          <md-list-item type="button" id="settings-share">
            <md-icon slot="start">ios_share</md-icon>
            <div slot="headline">Share app</div>
          </md-list-item>
          <md-list-item type="button" id="settings-other-apps">
            <md-icon slot="start">apps</md-icon>
            <div slot="headline">Other apps by me</div>
          </md-list-item>
          <md-list-item type="button" id="settings-github">
            <md-icon slot="start">code</md-icon>
            <div slot="headline">View source</div>
            <div slot="supporting-text">github.com/zoop-dev/taskly</div>
          </md-list-item>
          <md-list-item type="button" id="settings-clear-data">
            <md-icon slot="start">delete_sweep</md-icon>
            <div slot="headline">Clear all data</div>
            <div slot="supporting-text">removes every project, todo, and card</div>
          </md-list-item>
        </md-list>
      </div>
      <div slot="actions">
        <md-text-button id="settings-close">Close</md-text-button>
      </div>
    </md-dialog>
  `

  initBoardsScreen()
  initSettings()
}

function initSettings() {
  const settingsFab = document.querySelector('#settings-fab')
  const settingsDialog = document.querySelector('#settings-dialog')

  settingsFab.addEventListener('click', () => settingsDialog.show())
  document.querySelector('#settings-close').addEventListener('click', () => settingsDialog.close())

  document.querySelector('#settings-check-update').addEventListener('click', async (e) => {
    const item = e.currentTarget
    item.classList.add('spinning')
    let found = false
    try {
      found = await checkForUpdate()
    } catch {
      
    }
    setTimeout(() => item.classList.remove('spinning'), 600)
    settingsDialog.close()
    if (!found) showToast("you're on the latest version")
  })

  document.querySelector('#settings-changelog').addEventListener('click', () => {
    settingsDialog.close()
    showFullChangelog(CHANGELOG)
  })

  document.querySelector('#settings-theme').addEventListener('click', () => {
    settingsDialog.close()
    showThemePicker(THEMES, currentThemeKey, (key) => {
      currentThemeKey = key
      const supportingText = document.querySelector('#settings-theme div[slot="supporting-text"]')
      if (supportingText) supportingText.textContent = key
    }, THEME_KEY)
  })

  document.querySelector('#settings-share').addEventListener('click', async () => {
    const url = window.location.origin
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Taskly', text: 'a todo list and kanban board, no permissions needed', url })
      } catch {
        
      }
    } else {
      await navigator.clipboard.writeText(url)
      settingsDialog.close()
      showToast('link copied')
    }
  })

  document.querySelector('#settings-other-apps').addEventListener('click', () => {
    settingsDialog.close()
    showAppSwitcher('taskly')
  })

  document.querySelector('#settings-github').addEventListener('click', () => {
    window.open('https://github.com/zoop-dev/taskly', '_blank', 'noopener')
  })

  document.querySelector('#settings-clear-data').addEventListener('click', async () => {
    settingsDialog.close()
    const ok = await zkConfirm("This removes every project, todo, and card. Can't be undone.", {
      title: 'Clear all data?',
      confirmLabel: 'Clear',
      destructive: true,
    })
    if (!ok) return
    localStorage.clear()
    window.location.reload()
  })
}

function initBoardsScreen() {
  const list = document.querySelector('#boards-list')
  const newBoardBtn = document.querySelector('#new-board-btn')
  const dialog = document.querySelector('#new-board-dialog')
  const dialogInput = document.querySelector('#new-board-input')

  function render() {
    const boards = loadBoards()
    if (!boards.length) {
      list.innerHTML = `<div class="empty-hint">no projects yet</div>`
      return
    }
    
    const sorted = boards
      .map((b, i) => ({ b, i }))
      .sort((x, y) => (y.b.pinned ? 1 : 0) - (x.b.pinned ? 1 : 0) || x.i - y.i)
      .map((x) => x.b)

    list.innerHTML = sorted
      .map((b) => {
        const cardCount = COLUMNS.reduce((sum, c) => sum + b.columns[c.key].length, 0)
        const todoCount = b.todos.filter((t) => !t.done).length
        return `
          <div class="card board-row" data-id="${b.id}">
            <span class="drag-handle">${DRAG_HANDLE_SVG}</span>
            <div class="board-color-dot" style="background:${b.color}"></div>
            <div class="board-row-info">
              <div class="board-row-name">${b.name}</div>
              <div class="board-row-count">${todoCount} todo${todoCount === 1 ? '' : 's'} · ${cardCount} card${cardCount === 1 ? '' : 's'}</div>
            </div>
            <md-icon-button class="board-pin${b.pinned ? ' pinned' : ''}" data-id="${b.id}" aria-label="Pin project"><md-icon>push_pin</md-icon></md-icon-button>
            <md-icon-button class="board-delete" data-id="${b.id}" aria-label="Delete project"><md-icon>delete</md-icon></md-icon-button>
            <md-icon>chevron_right</md-icon>
          </div>
        `
      })
      .join('')

    list.querySelectorAll('.board-row').forEach((row) => {
      row.addEventListener('click', () => openBoard(row.dataset.id))
    })
    list.querySelectorAll('.board-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const ok = await zkConfirm('This removes all its todos and cards too. This can\'t be undone.', {
          title: 'Delete this project?',
          confirmLabel: 'Delete',
          destructive: true,
        })
        if (!ok) return
        const boards = loadBoards().filter((x) => x.id !== btn.dataset.id)
        saveBoards(boards)
        render()
      })
    })
    list.querySelectorAll('.board-pin').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const boards = loadBoards()
        const b = boards.find((x) => x.id === btn.dataset.id)
        if (b) b.pinned = !b.pinned
        saveBoards(boards)
        render()
      })
    })

    wireBoardDrag(list)
  }

  newBoardBtn.addEventListener('click', () => {
    dialogInput.value = ''
    dialog.show()
    setTimeout(() => dialogInput.focus(), 50)
  })

  document.querySelector('#new-board-cancel').addEventListener('click', () => dialog.close())
  document.querySelector('#new-board-create').addEventListener('click', () => {
    const name = dialogInput.value.trim()
    if (!name) return
    const boards = loadBoards()
    boards.push({
      id: uid(),
      name,
      color: BOARD_COLORS[boards.length % BOARD_COLORS.length],
      pinned: false,
      todos: [],
      columns: emptyColumns(),
    })
    saveBoards(boards)
    dialog.close()
    render()
  })

  render()
  window.__tasklyRenderBoards = render
}


let projectView = 'todo'

function openBoard(boardId) {
  projectView = 'todo'
  const el = document.createElement('div')
  el.id = 'board-overlay'
  el.className = 'search-overlay'
  document.body.appendChild(el)

  function render() {
    const boards = loadBoards()
    const board = boards.find((b) => b.id === boardId)
    if (!board) {
      closeBoard()
      return
    }

    el.innerHTML = `
      <div class="kanban-header">
        <md-icon-button id="board-back" aria-label="Back"><md-icon>arrow_back</md-icon></md-icon-button>
        <p class="kanban-title">${board.name}</p>
        <md-icon-button id="board-delete" aria-label="Delete project"><md-icon>delete</md-icon></md-icon-button>
      </div>
      <div style="padding:0 18px;">
        <div class="segmented has-thumb" id="project-view-segmented">
          <div class="segmented-thumb"></div>
          <button data-view="todo" class="${projectView === 'todo' ? 'active' : ''}">Todo</button>
          <button data-view="board" class="${projectView === 'board' ? 'active' : ''}">Board</button>
        </div>
      </div>
      <div id="project-body"></div>
    `

    el.querySelector('#board-back').addEventListener('click', popOverlay)
    el.querySelector('#board-delete').addEventListener('click', async () => {
      const ok = await zkConfirm('This removes all its todos and cards too. This can\'t be undone.', {
        title: 'Delete this project?',
        confirmLabel: 'Delete',
        destructive: true,
      })
      if (!ok) return
      const boards = loadBoards().filter((b) => b.id !== boardId)
      saveBoards(boards)
      popOverlay()
      window.__tasklyRenderBoards?.()
    })

    el.querySelectorAll('.segmented button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const oldThumb = el.querySelector('.segmented-thumb')
        const oldTransform = oldThumb?.style.transform
        const oldWidth = oldThumb?.style.width

        projectView = btn.dataset.view
        render()

        const newThumb = el.querySelector('.segmented-thumb')
        if (newThumb && oldTransform) {
          newThumb.style.transition = 'none'
          newThumb.style.transform = oldTransform
          newThumb.style.width = oldWidth
          newThumb.offsetWidth
          newThumb.style.transition = ''
          positionSegmentedThumb(el.querySelector('#project-view-segmented'), false)
        }
      })
    })

    positionSegmentedThumb(el.querySelector('#project-view-segmented'))

    if (projectView === 'todo') {
      renderProjectTodo(boardId, render)
    } else {
      renderProjectBoard(boardId, render)
    }
  }

  render()
  pushOverlay(closeBoard)
  requestAnimationFrame(() => el.classList.add('open'))

  function closeBoard() {
    el.classList.remove('open')
    setTimeout(() => {
      el.remove()
      window.__tasklyRenderBoards?.()
    }, 300)
  }
}

function renderProjectTodo(boardId, rerender) {
  const body = document.querySelector('#project-body')
  body.innerHTML = `
    <div style="padding:0 18px;">
      <div class="todo-add-row">
        <md-icon>add</md-icon>
        <input id="project-todo-input" type="text" placeholder="Add a task…" autocomplete="off" />
      </div>
      <div id="project-todo-list"></div>
    </div>
  `

  const boards = loadBoards()
  const board = boards.find((b) => b.id === boardId)
  const list = body.querySelector('#project-todo-list')

  if (!board.todos.length) {
    list.innerHTML = `<div class="empty-hint">nothing to do — nice</div>`
  } else {
    list.innerHTML = board.todos
      .map(
        (t) => `
          <div class="todo-row${t.done ? ' done' : ''}" data-id="${t.id}">
            <span class="drag-handle">${DRAG_HANDLE_SVG}</span>
            <button type="button" class="todo-check">
              <svg class="check-svg" viewBox="0 0 24 24">
                <path class="check-path" d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <span class="todo-text"><span class="todo-text-inner">${t.text}</span></span>
            <md-icon-button class="todo-delete" data-id="${t.id}" aria-label="Delete"><md-icon>close</md-icon></md-icon-button>
          </div>
        `
      )
      .join('')

    wireTodoDrag(list, boardId, rerender)

    list.querySelectorAll('.todo-check').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.todo-row')
        const bs = loadBoards()
        const b = bs.find((x) => x.id === boardId)
        const t = b.todos.find((x) => x.id === row.dataset.id)
        if (t) t.done = !t.done
        saveBoards(bs)
        rerender()
      })
    })
    list.querySelectorAll('.todo-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bs = loadBoards()
        const b = bs.find((x) => x.id === boardId)
        b.todos = b.todos.filter((x) => x.id !== btn.dataset.id)
        saveBoards(bs)
        rerender()
      })
    })
    list.querySelectorAll('.todo-text').forEach((textEl) => {
      textEl.addEventListener('dblclick', async () => {
        const row = textEl.closest('.todo-row')
        const currentText = textEl.textContent.trim()
        const newText = await zkPrompt('', { title: 'Edit task', defaultValue: currentText })
        if (!newText || newText === currentText) return
        const bs = loadBoards()
        const b = bs.find((x) => x.id === boardId)
        const t = b.todos.find((x) => x.id === row.dataset.id)
        if (t) t.text = newText
        saveBoards(bs)
        rerender()
      })
    })
  }

  body.querySelector('#project-todo-input').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return
    const input = e.target
    const text = input.value.trim()
    if (!text) return
    const bs = loadBoards()
    const b = bs.find((x) => x.id === boardId)
    b.todos.unshift({ id: uid(), text, done: false })
    saveBoards(bs)
    rerender()
  })
}

function wireTodoDrag(list, boardId, rerender) {
  list.querySelectorAll('.todo-row').forEach((row) => {
    const handle = row.querySelector('.drag-handle')
    handle.addEventListener('pointerdown', (e) => onTodoPointerDown(e, row, list, boardId, rerender))
  })
}

function onTodoPointerDown(startEvent, row, list, boardId, rerender) {
  if (startEvent.button != null && startEvent.button !== 0) return

  const startY = startEvent.clientY
  let lifted = false

  function onMove(ev) {
    const dy = ev.clientY - startY
    if (!lifted) {
      if (Math.abs(dy) < 10) return
      lifted = true
      row.setPointerCapture(startEvent.pointerId)
      row.classList.add('dragging')
    }

    const siblings = [...list.querySelectorAll('.todo-row')].filter((r) => r !== row)
    let insertBefore = null
    for (const sib of siblings) {
      const r = sib.getBoundingClientRect()
      if (ev.clientY < r.top + r.height / 2) {
        insertBefore = sib
        break
      }
    }

    const alreadyThere = insertBefore ? row.nextSibling === insertBefore : row === list.lastElementChild
    if (alreadyThere) return

    flipReorder(
      [list],
      () => {
        if (insertBefore) list.insertBefore(row, insertBefore)
        else list.appendChild(row)
      },
      '.todo-row'
    )
  }

  function onEnd() {
    row.releasePointerCapture?.(startEvent.pointerId)
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onEnd)
    document.removeEventListener('pointercancel', onEnd)

    row.classList.remove('dragging')
    if (!lifted) return

    const newOrder = [...list.querySelectorAll('.todo-row')].map((r) => r.dataset.id)
    const boards = loadBoards()
    const board = boards.find((b) => b.id === boardId)
    board.todos.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id))
    saveBoards(boards)
    rerender()
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onEnd)
  document.addEventListener('pointercancel', onEnd)
}

function wireBoardDrag(list) {
  list.querySelectorAll('.board-row').forEach((row) => {
    const handle = row.querySelector('.drag-handle')
    handle.addEventListener('pointerdown', (e) => onBoardPointerDown(e, row, list))
  })
}

function onBoardPointerDown(startEvent, row, list) {
  if (startEvent.button != null && startEvent.button !== 0) return

  const startY = startEvent.clientY
  let lifted = false

  function onMove(ev) {
    const dy = ev.clientY - startY
    if (!lifted) {
      if (Math.abs(dy) < 10) return
      lifted = true
      row.setPointerCapture(startEvent.pointerId)
      row.classList.add('dragging')
    }

    const siblings = [...list.querySelectorAll('.board-row')].filter((r) => r !== row)
    let insertBefore = null
    for (const sib of siblings) {
      const r = sib.getBoundingClientRect()
      if (ev.clientY < r.top + r.height / 2) {
        insertBefore = sib
        break
      }
    }

    const alreadyThere = insertBefore ? row.nextSibling === insertBefore : row === list.lastElementChild
    if (alreadyThere) return

    flipReorder(
      [list],
      () => {
        if (insertBefore) list.insertBefore(row, insertBefore)
        else list.appendChild(row)
      },
      '.board-row'
    )
  }

  function onEnd() {
    row.releasePointerCapture?.(startEvent.pointerId)
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onEnd)
    document.removeEventListener('pointercancel', onEnd)

    row.classList.remove('dragging')
    if (!lifted) return

    const newOrder = [...list.querySelectorAll('.board-row')].map((r) => r.dataset.id)
    const boards = loadBoards()
    boards.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id))
    saveBoards(boards)
    window.__tasklyRenderBoards?.()
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onEnd)
  document.addEventListener('pointercancel', onEnd)
}

function renderProjectBoard(boardId, rerender) {
  const body = document.querySelector('#project-body')
  const boards = loadBoards()
  const board = boards.find((b) => b.id === boardId)

  
  const oldHeights = new Map()
  body.querySelectorAll('.kanban-column').forEach((col) => {
    oldHeights.set(col.dataset.col, col.getBoundingClientRect().height)
  })

  body.innerHTML = `
    <div class="kanban-columns" id="kanban-columns">
      ${COLUMNS.map((col) => {
        const count = board.columns[col.key].length
        return `
        <div class="kanban-column" data-col="${col.key}">
          <div class="kanban-column-header">
            <div class="kanban-column-title"><span class="kanban-column-dot" style="background:${col.color}"></span>${col.label}</div>
            <span class="kanban-column-count">${count}</span>
          </div>
          <div class="kanban-cards" data-col="${col.key}">
            ${board.columns[col.key]
              .map(
                (card) => `
                  <div class="kanban-card" data-id="${card.id}" data-col="${col.key}">
                    <span class="drag-handle">${DRAG_HANDLE_SVG}</span>
                    <span class="kanban-card-text">${card.text}</span>
                  </div>
                `
              )
              .join('')}
          </div>
          <button type="button" class="kanban-add-card-btn" data-col="${col.key}">
            <md-icon>add</md-icon> Add card
          </button>
        </div>
      `
      }).join('')}
    </div>
  `

  if (oldHeights.size) {
    body.querySelectorAll('.kanban-column').forEach((col) => {
      const oldH = oldHeights.get(col.dataset.col)
      if (oldH == null) return
      const newH = col.getBoundingClientRect().height
      if (Math.abs(newH - oldH) < 1) return
      col.style.flex = 'none'
      col.style.height = `${oldH}px`
      col.style.transition = 'none'
      
      
      col.offsetHeight
      col.style.transition = 'height 0.25s ease'
      col.style.height = `${newH}px`
      col.addEventListener(
        'transitionend',
        () => {
          col.style.flex = ''
          col.style.height = ''
          col.style.transition = ''
        },
        { once: true }
      )
    })
  }

  body.querySelectorAll('.kanban-add-card-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = await zkPrompt('', { title: 'New card', placeholder: 'Card text…' })
      if (!text) return
      const bs = loadBoards()
      const b = bs.find((x) => x.id === boardId)
      const newId = uid()
      b.columns[btn.dataset.col].push({ id: newId, text })
      saveBoards(bs)
      rerender()
      requestAnimationFrame(() => {
        const el = document.querySelector(`.kanban-card[data-id="${newId}"]`)
        el?.classList.add('card-enter')
        el?.addEventListener('animationend', () => el.classList.remove('card-enter'), { once: true })
      })
    })
  })

  body.querySelectorAll('.kanban-card-text').forEach((textEl) => {
    textEl.addEventListener('dblclick', async () => {
      const card = textEl.closest('.kanban-card')
      const currentText = textEl.textContent.trim()
      const newText = await zkPrompt('', { title: 'Edit card', defaultValue: currentText })
      if (!newText || newText === currentText) return
      const bs = loadBoards()
      const b = bs.find((x) => x.id === boardId)
      const c = b.columns[card.dataset.col].find((x) => x.id === card.dataset.id)
      if (c) c.text = newText
      saveBoards(bs)
      rerender()
    })
  })

  wireDrag(body, boardId, rerender)
}


function wireDrag(root, boardId, rerender) {
  root.querySelectorAll('.kanban-card').forEach((card) => {
    const handle = card.querySelector('.drag-handle')
    handle.addEventListener('pointerdown', (e) => onCardPointerDown(e, card, root, boardId, rerender))
  })
}

function flipReorder(containers, mutate, itemSelector = '.kanban-card') {
  const items = containers.flatMap((el) => [...el.querySelectorAll(itemSelector)])
  const before = new Map(items.map((c) => [c, c.getBoundingClientRect()]))

  mutate()

  const after = containers.flatMap((el) => [...el.querySelectorAll(itemSelector)])
  after.forEach((c) => {
    const oldRect = before.get(c)
    if (!oldRect) return
    const newRect = c.getBoundingClientRect()
    const dy = oldRect.top - newRect.top
    if (Math.abs(dy) < 1) return
    c.style.transition = 'none'
    c.style.transform = `translateY(${dy}px)`
    requestAnimationFrame(() => {
      c.style.transition = 'transform 0.18s ease'
      c.style.transform = ''
    })
  })
}

function onCardPointerDown(startEvent, card, root, boardId, rerender) {
  if (startEvent.button != null && startEvent.button !== 0) return 

  const startX = startEvent.clientX
  const startY = startEvent.clientY
  const originalCol = card.dataset.col
  const cardRect = card.getBoundingClientRect()
  const offsetX = startX - cardRect.left
  const offsetY = startY - cardRect.top
  let lifted = false
  let ghost = null

  function onMove(ev) {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY

    if (!lifted) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      lifted = true
      card.setPointerCapture(startEvent.pointerId)
      card.classList.add('dragging')
      card.style.touchAction = 'none'
      ghost = document.createElement('div')
      ghost.className = 'kanban-card-ghost'
      ghost.innerHTML = `
        <span class="drag-handle">${DRAG_HANDLE_SVG}</span>
        <span class="kanban-card-text">${card.querySelector('.kanban-card-text').textContent}</span>
      `
      ghost.style.width = `${card.offsetWidth}px`
      document.body.appendChild(ghost)
    }

    ghost.style.left = `${ev.clientX - offsetX}px`
    ghost.style.top = `${ev.clientY - offsetY}px`

    
    
    let targetCardsEl = null
    root.querySelectorAll('.kanban-column').forEach((col) => {
      const rect = col.getBoundingClientRect()
      const over = ev.clientY >= rect.top && ev.clientY <= rect.bottom
      col.classList.toggle('drop-target', over)
      if (over) targetCardsEl = col.querySelector('.kanban-cards')
    })
    if (!targetCardsEl) return

    
    
    
    const siblings = [...targetCardsEl.querySelectorAll('.kanban-card')].filter((c) => c !== card)
    let insertBefore = null
    for (const sib of siblings) {
      const r = sib.getBoundingClientRect()
      if (ev.clientY < r.top + r.height / 2) {
        insertBefore = sib
        break
      }
    }

    const alreadyThere = insertBefore ? card.nextSibling === insertBefore || card === insertBefore.previousSibling : card === targetCardsEl.lastChild
    if (card.parentElement === targetCardsEl && alreadyThere) return

    const sourceCardsEl = card.parentElement
    const affected = sourceCardsEl === targetCardsEl ? [targetCardsEl] : [sourceCardsEl, targetCardsEl]

    flipReorder(affected, () => {
      if (insertBefore) targetCardsEl.insertBefore(card, insertBefore)
      else targetCardsEl.appendChild(card)
    })
  }

  function onEnd() {
    card.releasePointerCapture?.(startEvent.pointerId)
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onEnd)
    document.removeEventListener('pointercancel', onEnd)

    root.querySelectorAll('.kanban-column').forEach((col) => col.classList.remove('drop-target'))
    card.classList.remove('dragging')
    card.style.touchAction = ''
    ghost?.remove()
    if (!lifted) return

    
    
    const cardsContainer = card.closest('.kanban-cards')
    if (!cardsContainer) return
    const toCol = cardsContainer.dataset.col
    const toIndex = [...cardsContainer.querySelectorAll('.kanban-card')].indexOf(card)
    const cardId = card.dataset.id

    const boards = loadBoards()
    const board = boards.find((b) => b.id === boardId)
    const fromIdx = board.columns[originalCol].findIndex((c) => c.id === cardId)
    if (fromIdx === -1) return
    const [moved] = board.columns[originalCol].splice(fromIdx, 1)
    board.columns[toCol].splice(toIndex, 0, moved)
    saveBoards(boards)
    rerender()
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onEnd)
  document.addEventListener('pointercancel', onEnd)
}
