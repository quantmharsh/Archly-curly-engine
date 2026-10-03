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

Report viewport/browser, steps, expected and actual outcomes, and console errors. Attach screenshots for visual issues.
