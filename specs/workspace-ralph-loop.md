# Ralph Loop: Workspace Feature Implementation

## Execution Sequence

```
010 (CRUD Actions) → 011 (Folders) → 012 (Graph & Polish)
```

**Each spec must be created with `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` before implementation.**

---

## Phase 1: Spec 010 — Workspace CRUD Actions (`specs/010-workspace-crud/`)

### Description for `/speckit.specify`

> Workspace CRUD Actions — Implementar todas as ações de create/read/update/delete na página /workspace do Relay.
>
> **Create Workflow (blank)**: Server action que insere um novo workflow na tabela `workflows` com status 'draft', redireciona para `/workflows/[id]/edit`. O botão "New workflow" no header já navega para `/workflows/new/edit` mas precisa de um server action real.
>
> **Create Workflow (from template)**: Dialog modal com 3-5 templates hardcoded (ex: "Email Automation", "Data Sync", "Approval Flow"). Cada template cria workflow pré-populado com steps e trigger, depois redireciona ao editor.
>
> **Duplicate Workflow**: Server action que copia o workflow + todos os steps + trigger. Nome = "[Original] (copy)". Redireciona para o editor do novo workflow.
>
> **Delete Workflow**: AlertDialog de confirmação ("Are you sure?"). Server action que deleta o workflow e todos os steps/triggers/runs associados.
>
> **Delete Agent**: AlertDialog de confirmação. Server action que deleta o agent e desassocia os workflows (agent_skills).
>
> **Edit Agent**: Navegar para `/agents/[id]` ao clicar "Edit" no dropdown de um agent.
>
> **Rename Workflow inline**: Permitir double-click no nome do workflow na tabela para renomear inline.
>
> **Bulk Actions**: Quando rows estão selecionadas, mostrar uma action bar fixa no topo da tabela com: "Delete selected" e "Change status" (draft/published toggle).
>
> **Colunas faltando**: Adicionar colunas Published (data formatada), Steps (contagem), AI (ícone sparkles se has_ai_steps).
>
> Padrões existentes: server actions em `src/lib/actions/`, queries em `src/lib/queries/workspace.ts`, tipos em `src/lib/supabase/database.types.ts`. Usar `revalidatePath('/workspace')` após mutations.

### Dependencies

None — executes first.

### Files to Modify

| File                                            | Change                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| `src/components/workspace/columns.tsx`          | Add missing columns (Published, Steps, AI), wire action handlers |
| `src/components/workspace/workspace-header.tsx` | Connect "New folder" and "From template" buttons                 |
| `src/components/workspace/workspace-client.tsx` | Add bulk actions bar                                             |
| `src/lib/actions/workspace.ts`                  | **NEW** — Server actions for all CRUD operations                 |
| `src/components/workspace/delete-dialog.tsx`    | **NEW** — Reusable AlertDialog for confirmations                 |
| `src/components/workspace/template-dialog.tsx`  | **NEW** — Template picker dialog                                 |
| `src/components/workspace/bulk-action-bar.tsx`  | **NEW** — Fixed action bar for selected rows                     |

### Acceptance Criteria

- [ ] "New workflow" creates a real workflow in DB and redirects to editor
- [ ] "From template" opens dialog, creates pre-populated workflow
- [ ] "Duplicate" copies workflow + steps + trigger with "(copy)" suffix
- [ ] "Delete Workflow" shows confirmation dialog, deletes on confirm
- [ ] "Delete Agent" shows confirmation dialog, deletes on confirm
- [ ] "Edit Agent" navigates to `/agents/[id]`
- [ ] Double-click on workflow name enables inline rename
- [ ] Selected rows show bulk action bar with "Delete" and "Change status"
- [ ] Published, Steps, AI columns render correctly
- [ ] `bun run build` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes

### Checkpoint

After completing 010, verify:

1. All CRUD actions work end-to-end
2. No "Coming soon" toasts remain for CRUD features
3. Build + lint + tests pass

---

## Phase 2: Spec 011 — Workspace Folder System (`specs/011-workspace-folders/`)

### Description for `/speckit.specify`

> Workspace Folder System — Implementar o sistema completo de pastas na página /workspace do Relay.
>
> **DB já existe**: tabela `folders` com `id, team_id, name, parent_id, created_at, updated_at`. Tabela `workflows` tem `folder_id` nullable.
>
> **Create Folder**: Dialog com input de nome. Server action insere na tabela `folders`. Folder aparece na tabela como row com ícone FolderOpen, expandível como agents.
>
> **Folder View mode**: Quando "Folder" view está ativa no ViewToggle, renderizar items agrupados por folder. Folders no topo (expandíveis), workflows sem folder abaixo. Breadcrumb navigation quando dentro de um folder.
>
> **Move to Folder**: Dialog com tree picker mostrando todas as folders do team. Server action atualiza `workflows.folder_id`. Suportar mover múltiplos items (bulk move via seleção).
>
> **Rename Folder**: Double-click no nome da folder para inline edit. Server action atualiza `folders.name`.
>
> **Delete Folder**: AlertDialog com opções: "Move contents to root" ou "Delete folder and contents". Server action adequada.
>
> **Nested Folders**: Suportar `parent_id` para hierarquia. Renderizar com indentação visual.
>
> Queries: adicionar `fetchFolders` em `src/lib/queries/workspace.ts`. Actions: criar `src/lib/actions/workspace.ts`.

### Dependencies

Depends on **010** (reuses server action patterns and delete-dialog).

### Files to Modify

| File                                            | Change                                                 |
| ----------------------------------------------- | ------------------------------------------------------ |
| `src/lib/queries/workspace.ts`                  | Add `fetchFolders`, folder types                       |
| `src/lib/actions/workspace.ts`                  | Add folder CRUD actions (create, rename, delete, move) |
| `src/components/workspace/workspace-client.tsx` | Folder view rendering, breadcrumb nav                  |
| `src/components/workspace/view-toggle.tsx`      | Enable folder view (remove stub)                       |
| `src/components/workspace/columns.tsx`          | "Move to Folder" handler                               |
| `src/components/workspace/folder-picker.tsx`    | **NEW** — Tree picker dialog for folder selection      |

### Acceptance Criteria

- [ ] "New Folder" creates folder in DB, appears in table
- [ ] Folder view groups items by folder with expandable rows
- [ ] Breadcrumb navigation when inside a folder
- [ ] "Move to Folder" dialog shows folder tree, moves item(s)
- [ ] Bulk move works with selected rows
- [ ] Double-click folder name enables inline rename
- [ ] Delete folder offers "Move to root" or "Delete all" options
- [ ] Nested folders render with indentation
- [ ] `bun run build` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes

### Checkpoint

After completing 011, verify:

1. Folder CRUD fully functional
2. Folder view renders correctly
3. Move to folder works (single + bulk)
4. Build + lint + tests pass

---

## Phase 3: Spec 012 — Workspace Graph View & Polish (`specs/012-workspace-polish/`)

### Description for `/speckit.specify`

> Workspace Graph View & Polish — Implementar a visualização em grafo e melhorias finais na página /workspace do Relay.
>
> **Graph View**: Quando "Graph" view está ativa no ViewToggle, renderizar uma visualização de rede mostrando agents como nós grandes e workflows como nós menores. Edges conectam agents aos seus workflows (via agent_skills). Usar react-flow ou similar. Nodes clicáveis (workflow → editor, agent → agent detail). Layout automático (dagre ou elk).
>
> **Keyboard Navigation**: Arrow keys para navegar entre rows, Enter para abrir item, Delete para trigger delete dialog, Escape para deselect, Space para toggle select.
>
> **Real-time Revalidation**: Após qualquer mutation (create/delete/duplicate/move), revalidar os dados da workspace via `revalidatePath` ou `router.refresh()`. Feedback otimista onde possível.
>
> **Optimistic UI**: Para delete, remover o item da tabela imediatamente e reverter se o server action falhar. Para status change, atualizar badge imediatamente.
>
> **Loading States**: Skeleton loading nos dialogs enquanto server actions processam. Disabled buttons durante mutations.
>
> Depende de: 010-workspace-crud (patterns de server actions), 011-workspace-folders (folder data).

### Dependencies

Depends on **010 + 011**.

### Files to Modify

| File                                            | Change                                      |
| ----------------------------------------------- | ------------------------------------------- |
| `src/components/workspace/view-toggle.tsx`      | Enable graph view (remove toast stub)       |
| `src/components/workspace/workspace-client.tsx` | Keyboard nav, optimistic UI, loading states |
| `src/components/workspace/graph-view.tsx`       | **NEW** — react-flow network visualization  |
| `package.json`                                  | Add `@xyflow/react` (react-flow) dependency |

### Acceptance Criteria

- [ ] Graph view renders agents + workflows as interactive network
- [ ] Nodes are clickable (workflow → editor, agent → detail)
- [ ] Auto-layout positions nodes logically
- [ ] Keyboard navigation works (arrows, Enter, Delete, Escape, Space)
- [ ] Optimistic UI for delete and status change
- [ ] Loading states in dialogs during mutations
- [ ] No "Coming soon" toasts remain anywhere in workspace
- [ ] `bun run build` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes

### Checkpoint

After completing 012, verify:

1. All 3 view modes work (list, folder, graph)
2. Zero stub actions remain
3. Full keyboard accessibility
4. Build + lint + tests pass

---

## Stub Reference

| #   | Feature            | File                      | Current State                              |
| --- | ------------------ | ------------------------- | ------------------------------------------ |
| 1   | New Folder         | `workspace-header.tsx:23` | `toast('Coming soon')`                     |
| 2   | From Template      | `workspace-header.tsx:29` | `toast('Coming soon')`                     |
| 3   | Duplicate Workflow | `columns.tsx:202`         | `<DropdownMenuItem>` no handler            |
| 4   | Move to Folder     | `columns.tsx:203`         | `<DropdownMenuItem>` no handler            |
| 5   | Delete Workflow    | `columns.tsx:207`         | `<DropdownMenuItem>` no handler, no dialog |
| 6   | Delete Agent       | `columns.tsx:207`         | `<DropdownMenuItem>` no handler, no dialog |
| 7   | Edit Agent         | `columns.tsx:205`         | `<DropdownMenuItem>` no handler            |
| 8   | Graph View         | `view-toggle.tsx:16`      | `toast('Coming soon')`                     |
| 9   | Folder View        | `view-toggle.tsx`         | activeView='folder' renders same as 'list' |
| 10  | Bulk Actions       | `columns.tsx:40-56`       | Checkboxes work, no action bar             |
| 11  | Missing Columns    | `columns.tsx`             | Published, Steps, AI not implemented       |

## Test Commands

```bash
bun run build    # Must pass after each phase
bun run lint     # Must pass after each phase
bun run test     # Must pass after each phase
```
