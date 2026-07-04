
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
import { initUpdateCheck } from 'zoop-kit/update-check.js'
import { maybeShowChangelog } from 'zoop-kit/changelog.js'
import { initDesktopWarning } from 'zoop-kit/desktop-warning.js'
import { initSavedTheme, THEMES } from 'zoop-kit/theme-picker.js'
import { initSettingsMenu } from 'zoop-kit/settings-menu.js'
import { wireDragList, flipReorder, DRAG_HANDLE_SVG } from 'zoop-kit/drag-list.js'
import { wireSegmentedTabs } from 'zoop-kit/segmented.js'
import confetti from 'canvas-confetti'
import { APP_VERSION, CHANGELOG } from './changelog.js'

const BOARDS_KEY = 'taskly:boards'
const VERSION_KEY = 'taskly:version'
const THEME_KEY = 'taskly:theme'

let currentThemeKey = initSavedTheme(THEME_KEY, THEMES, 'violet')

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

  `

  initBoardsScreen()
  initSettings()
}

function initSettings() {
  initSettingsMenu({
    version: APP_VERSION,
    changelog: CHANGELOG,
    themes: THEMES,
    themeKey: currentThemeKey,
    themeStorageKey: THEME_KEY,
    onThemeChange: (key) => {
      currentThemeKey = key
    },
    shareData: { title: 'Taskly', text: 'a todo list and kanban board, no permissions needed', url: location.origin },
    githubUrl: 'https://github.com/zoop-dev/taskly',
    onClearData: () => {
      localStorage.clear()
      window.location.reload()
    },
    clearDataTitle: 'Clear all data?',
    clearDataMessage: "This removes every project, todo, and card. Can't be undone.",
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
            <span class="zk-drag-handle">${DRAG_HANDLE_SVG}</span>
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

    wireDragList({
      container: list,
      itemSelector: '.board-row',
      onReorder: (newOrder) => {
        const boards = loadBoards()
        boards.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id))
        saveBoards(boards)
        window.__tasklyRenderBoards?.()
      },
    })
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
        <div class="kanban-delete-zone" id="kanban-delete-zone">
          <md-icon>delete</md-icon> Drop here to delete
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

    wireSegmentedTabs('#project-view-segmented', (view) => {
      projectView = view
      render()
    })

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

function fireConfetti(originEl) {
  const rect = originEl.getBoundingClientRect()
  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 32,
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    },
    colors: ['#b28dff', '#8ec9ff', '#5ee0a0', '#ffd76a', '#ff9f5a', '#ff6ad5'],
  })
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
            <span class="zk-drag-handle">${DRAG_HANDLE_SVG}</span>
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

    wireDragList({
      container: list,
      itemSelector: '.todo-row',
      onReorder: (newOrder) => {
        const boards = loadBoards()
        const board = boards.find((b) => b.id === boardId)
        board.todos.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id))
        saveBoards(boards)
        rerender()
      },
    })

    list.querySelectorAll('.todo-check').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.todo-row')
        const bs = loadBoards()
        const b = bs.find((x) => x.id === boardId)
        const t = b.todos.find((x) => x.id === row.dataset.id)
        if (t) t.done = !t.done
        saveBoards(bs)
        if (t?.done && b.todos.length > 1 && b.todos.every((x) => x.done)) fireConfetti(btn)
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
                    <span class="zk-drag-handle">${DRAG_HANDLE_SVG}</span>
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
    const handle = card.querySelector('.zk-drag-handle')
    handle.addEventListener('pointerdown', (e) => onCardPointerDown(e, card, root, boardId, rerender))
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
  let overDeleteZone = false
  const deleteZone = document.querySelector('#kanban-delete-zone')

  function onMove(ev) {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY

    if (!lifted) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      lifted = true
      card.setPointerCapture(startEvent.pointerId)
      card.classList.add('zk-dragging')
      card.style.touchAction = 'none'
      ghost = document.createElement('div')
      ghost.className = 'kanban-card-ghost'
      ghost.innerHTML = `
        <span class="zk-drag-handle">${DRAG_HANDLE_SVG}</span>
        <span class="kanban-card-text">${card.querySelector('.kanban-card-text').textContent}</span>
      `
      ghost.style.width = `${card.offsetWidth}px`
      document.body.appendChild(ghost)
      deleteZone?.classList.add('visible')
    }

    ghost.style.left = `${ev.clientX - offsetX}px`
    ghost.style.top = `${ev.clientY - offsetY}px`

    if (deleteZone) {
      const dzRect = deleteZone.getBoundingClientRect()
      overDeleteZone = ev.clientX >= dzRect.left && ev.clientX <= dzRect.right && ev.clientY >= dzRect.top && ev.clientY <= dzRect.bottom
      deleteZone.classList.toggle('drop-target', overDeleteZone)
    }

    if (overDeleteZone) {
      root.querySelectorAll('.kanban-column').forEach((col) => col.classList.remove('drop-target'))
      return
    }

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

    flipReorder(
      affected,
      () => {
        if (insertBefore) targetCardsEl.insertBefore(card, insertBefore)
        else targetCardsEl.appendChild(card)
      },
      '.kanban-card'
    )
  }

  function onEnd() {
    card.releasePointerCapture?.(startEvent.pointerId)
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onEnd)
    document.removeEventListener('pointercancel', onEnd)

    root.querySelectorAll('.kanban-column').forEach((col) => col.classList.remove('drop-target'))
    deleteZone?.classList.remove('visible', 'drop-target')
    card.classList.remove('zk-dragging')
    card.style.touchAction = ''
    ghost?.remove()
    if (!lifted) return

    if (overDeleteZone) {
      const cardId = card.dataset.id
      const boards = loadBoards()
      const board = boards.find((b) => b.id === boardId)
      const fromIdx = board.columns[originalCol].findIndex((c) => c.id === cardId)
      if (fromIdx === -1) return
      board.columns[originalCol].splice(fromIdx, 1)
      saveBoards(boards)
      rerender()
      return
    }

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
