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
