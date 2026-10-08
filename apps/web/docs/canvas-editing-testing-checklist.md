# Canvas Editing QA Handoff

Testing is assigned to the separate testing agent. The coding agent did not run tests or browser checks for this work.

## Multi-select and group movement

- [ ] Drag a marquee over empty canvas. Confirm components fully inside the selection rectangle are selected together.
- [ ] Drag the selected group. Confirm every selected component keeps its relative position and connected arrows remain attached.
- [ ] Undo and redo a group move. Confirm one undo returns the entire group to its original positions.
- [ ] Select nodes individually with the platform modifier key and verify existing selection can be extended/adjusted.
- [ ] Confirm left-drag on empty canvas selects, and panning works with two-finger/trackpad scroll, Space + drag, and middle/right mouse drag.

## Copy and paste

- [ ] Select one component and press Ctrl+C / Cmd+C, then Ctrl+V / Cmd+V. Confirm a duplicate appears offset and selected.
- [ ] Marquee-select multiple connected components and copy/paste. Confirm all selected nodes are duplicated and arrows whose endpoints are both selected are duplicated with correctly remapped endpoints.
- [ ] Copy a selection containing a bent arrow. Confirm bends retain their shape and are offset along with the copied components.
- [ ] Include a selected node connected to an unselected node. Confirm that external connection is not duplicated as a dangling or incorrectly attached arrow.
- [ ] Paste repeatedly. Confirm each copy receives unique IDs and offsets enough to remain discoverable.
- [ ] Undo a paste and redo it. Confirm the entire pasted group and its internal arrows are removed/restored together.
- [ ] Confirm Ctrl/Cmd+C/V in title, inspector inputs, and inline component rename fields retain normal text editing behavior.

## Undo, redo, and deletion

- [ ] Add a component, undo, then redo. Confirm add/remove/restore behavior.
- [ ] Select and delete multiple components with Backspace/Delete. Confirm connected arrows disappear and one undo restores the whole selection and connections.
- [ ] Delete an arrow and undo/redo. Confirm the same arrow is restored/removed.
- [ ] Verify Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes; confirm toolbar buttons match the available history.
- [ ] Confirm keyboard shortcuts do not intercept typing in any editable field.

## Regression

- [ ] Confirm marquee selection and keyboard editing continue to work with panels open/closed, after zoom/pan, and in browser fullscreen.
- [ ] Reload after paste/move/delete and verify the resulting graph persists. Selection highlighting itself should not persist as document state.
- [ ] Check browser console for interaction or React Flow warnings during the cases above.

## JSON backup import and recovery

- [ ] Open My canvases and choose Import JSON backup. Confirm the import dialog explains that imports create a new canvas and never replace an existing one.
- [ ] Choose a valid exported Archly JSON file. Confirm the preview shows its title, filename, component count, and connection count before import is enabled.
- [ ] Cancel after preview. Confirm no canvas is created or changed.
- [ ] Import a valid backup. Confirm it opens as a new canvas with its graph, title, viewport, canvas color, grid, edge labels, and arrow bend points preserved.
- [ ] Confirm the original canvas remains in My canvases and its latest unsaved edits are retained after import.
- [ ] Import the same backup more than once. Confirm each import is a separate new canvas with a unique ID; same-name canvases are not overwritten.
- [ ] Choose malformed JSON, a valid JSON file with an invalid Archly schema, a non-JSON file, and a file over the 10 MB limit. Confirm a clear error appears and the open canvas/library data remain unchanged.
- [ ] After successful import, edit and reload the imported canvas. Confirm it persists in IndexedDB like a regular diagram.
- [ ] Confirm the file picker can select the same file again after a failed attempt.

## Connection label and style editing

- [ ] Double-click a labeled arrow. Confirm its label becomes an inline input, receives focus, and does not pan or zoom the canvas.
- [ ] Rename a label with Enter and with blur. Confirm blank labels clear and Escape cancels without changing the saved label.
- [ ] Select an arrow and open Connection details explicitly. Confirm merely selecting an arrow does not open the right panel.
- [ ] Change its label, relationship category, color, solid/dashed style, and animation independently. Confirm arrow endpoints and bend points remain unchanged.
- [ ] Change the relationship between HTTPS request, data flow, and event publish. Confirm each selection changes the visible line treatment (blue solid, green dashed, orange dotted) immediately, and the inspector selection stays in sync.
- [ ] Change relationship to Custom. Confirm the neutral solid treatment returns; reselect a category and confirm its preset is restored. Then verify manual color and line-style overrides still work.
- [ ] Drag an arrow bend point, then move either connected component. Confirm the label tracks the midpoint of the updated route and does not remain at its previous position.
- [ ] Switch the line style between solid and dashed. Confirm dashed has clearly separated, visible dash segments at normal canvas zoom and solid removes the dash pattern.
- [ ] Undo/redo label, category, line color, line style, animation, and deletion changes.
- [ ] Export and import a diagram after editing connection details. Confirm label/category/color/style/animation survive the round trip.
- [ ] Confirm older diagrams with no edge category or custom style still load and remain editable.
- [ ] Confirm Ctrl/Cmd+Z while the inline or inspector label input has focus edits text normally; after leaving the field, it undoes the committed label change.
- [ ] Change edge appearance, export the diagram, re-import it as a new canvas, and confirm label, relationship category, line color, dashed/solid style, and animation are restored.

Report viewport/browser, steps, expected and actual outcomes, and console errors. Attach screenshots for visual issues.

## Four-way connections and component kinds

- [ ] Hover a component and confirm handles appear on all four sides (left, right, top, bottom).
- [ ] Drag from an upper component's bottom handle to a lower component's top handle. Confirm the arrow runs top-to-bottom with the arrowhead at the lower component.
- [ ] Drag from a lower component's top handle to an upper component's bottom handle. Confirm the arrow runs bottom-to-top and the arrowhead is at the upper component.
- [ ] Drag from a left or right handle in both directions (out of a node and into a node) and confirm the drag direction determines which component is the source.
- [ ] Confirm a vertically connected arrow keeps its top/bottom routing after autosave and reload, after switching canvases and back, and after export → import.
- [ ] Open a diagram saved before four-way handles (or the seeded commerce diagram) and confirm every arrow still attaches right-to-left exactly as before.
- [ ] Select a vertically routed arrow and confirm bend points, label editing, and the Connection details panel still work.
- [ ] Add each new component kind (Decision, Worker, Function) from the palette, the right-click menu, and the command palette. Confirm the icon, tint, and minimap colour differ from the existing kinds.
- [ ] Confirm the palette count badge matches the number of component cards listed.
- [ ] Confirm the components panel still scrolls and the connection templates remain reachable with the longer component list.

## Direct-use interactions (canvas speed pass)

- [ ] Press Ctrl/⌘ K (or click the ⌘ K button in the right panel footer). Confirm the command palette opens, filters as you type, and runs add-component, canvas, edit, and view commands; confirm Escape and Enter behave as expected.
- [ ] Right-click a component. Confirm a context menu appears with Open details, Duplicate, Connect from here (request/data/event), and Delete; confirm each action works and the menu closes on outside click and Escape.
- [ ] Right-click an arrow and confirm the Connection menu (Open details, Delete) works.
- [ ] Right-click empty canvas and confirm the Add component / Paste / Fit view menu works; confirm a chosen component lands at that point and on the grid.
- [ ] Double-click empty canvas. Confirm a quick-add menu appears at the pointer and the added component snaps to the 22px grid.
- [ ] Add a component from the palette and confirm it appears near the viewport center (not at a fixed offset) and snaps to the grid.
- [ ] Drag components with snapping on. Confirm positions land on the 22px grid and a full drag is a single undo step.
- [ ] Select a connection template, then drag from a handle to another component. Confirm the new arrow uses that category (color/style/animation) instead of always defaulting to HTTPS request.
- [ ] Drag an existing arrow's endpoint onto a different component. Confirm the arrow re-attaches and the change is undoable. Also click one handle then another and confirm the connection is created.
- [ ] Ctrl/Cmd-click components to extend the selection; confirm multi-select works alongside marquee selection.
- [ ] Select component(s) and press the Arrow keys to nudge; confirm movement snaps to the grid, Shift+Arrow moves further, and each nudge is undoable.
- [ ] Select component(s) and press Ctrl/⌘ D; confirm a duplicate appears offset and selected (including internal arrows and bends).
- [ ] Press Shift+1 to fit the view and Ctrl/⌘ +/- to zoom; confirm the viewport responds and the diagram stays usable.
- [ ] Edit a component's name, description, and color, then undo. Confirm each edit is undoable.
- [ ] Confirm the enlarged connection handles are easy to grab and that marquee selection, panning (two-finger/scroll, Space+drag, middle/right drag), copy/paste, undo/redo, bend editing, and fullscreen still behave as before.
