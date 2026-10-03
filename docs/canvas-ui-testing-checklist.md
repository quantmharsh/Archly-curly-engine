# Canvas UI Testing Checklist

Use this checklist to review the Phase 1A canvas workspace, inline component renaming, draggable arrow routes, and full-screen mode. The coding agent has not run these checks; testing is assigned to the testing agent.

## Canvas space and side panels

- [ ] On a desktop viewport (for example, 1440 × 900), the right panel starts closed and the canvas uses the available space beside the components panel.
- [ ] Close the components panel using its close control. Confirm the canvas expands and the toolbar control can reopen the panel.
- [ ] Open and close Canvas settings from the toolbar. Confirm it does not open merely by selecting a component.
- [ ] Open Component details for a selected component. Confirm it opens only after the explicit toolbar action and the close control closes it.
- [ ] Open both panels, then close each one independently. Confirm the other panel remains in its current state and the canvas resizes cleanly.
- [ ] Resize through desktop, tablet (around 768 px wide), and mobile (around 390 px wide) layouts. Confirm panel controls remain reachable, panels do not cover the whole canvas unexpectedly, and closing a mobile panel returns access to the canvas.
- [ ] Pan and zoom the diagram, toggle panels, and confirm nodes and edges remain in the same graph positions and the viewport stays usable.
- [ ] Enter full screen. Confirm the app headers and panels disappear, the whole graph fits, and the Escape key exits back to the normal workspace with the previous zoom and pan restored.
- [ ] Put a bend far outside the node bounds, enter full screen, and confirm the route point is included in the fitted view.
- [ ] Enter full screen with an empty diagram and with a large diagram. Confirm both remain usable and Escape works.

## Draggable arrow routes

- [ ] Select an existing arrow. Confirm an add-bend control appears; add a bend and drag its handle away from the default route.
- [ ] Add several bends to one arrow and drag each independently. Confirm the curve passes through each bend without changing its source or destination nodes.
- [ ] Add another bend after moving an existing one. Confirm the new handle does not overlap the existing handle; double-click a bend to remove just that bend.
- [ ] Drag bend handles at different zoom levels and after panning. Confirm pointer positions map correctly onto the canvas.
- [ ] Confirm labels, arrowheads, and animated connection styles remain visible and correctly attached while bending.
- [ ] Undo/Redo a bend edit and confirm the route returns to the prior shape and then reapplies.
- [ ] Autosave, reload the diagram, and confirm waypoint routes persist. Export the JSON and confirm waypoint coordinates are present on the corresponding edge.
- [ ] Open an older saved diagram with no waypoint data. Confirm its existing connections still render and can be bent.

## Inline component name editing

- [ ] Double-click different parts of a component (name, icon, or description area). Confirm the name becomes an input and receives focus; double-click does not zoom the canvas.
- [ ] Type a new name and press Enter. Confirm the node and any visible component details show the new name.
- [ ] Edit the name and click elsewhere. Confirm the change is committed.
- [ ] Edit the name and press Escape. Confirm the previous name is restored.
- [ ] Clear the name and commit. Confirm the resulting name is `Untitled component` rather than a blank label.
- [ ] Enter a name longer than 80 characters. Confirm input length is capped at 80.
- [ ] Select a component with a single click. Confirm the inspector does not open automatically. Then use Component details and confirm the advanced name, description, and color controls still work.
- [ ] Rename a component and use Undo/Redo. Confirm history behaves predictably and does not remove or duplicate the node.
- [ ] Reload the diagram after autosave. Confirm the renamed label persists in IndexedDB.
- [ ] Rename a component and export JSON. Confirm the exported graph contains the updated label.
- [ ] With a connection template active, double-click a component. Confirm it does not create an unintended edge or leave connection mode in a confusing state.

## Existing canvas behavior regression checks

- [ ] Add a component from the toolbar and from the components panel; confirm both paths still work with either panel state.
- [ ] Create each connection template (HTTPS request, data flow, event publish), then create a connection by dragging between handles. Confirm newly created arrows can also be selected and bent.
- [ ] Delete a selected component with the keyboard and confirm connected edges are removed with it.
- [ ] Change canvas color/grid settings and confirm the diagram still autosaves and reopens correctly.
- [ ] Switch diagrams using the canvas library and confirm each diagram keeps its own labels, positions, viewport, and appearance.

## Report back

Record viewport/browser, steps, expected result, actual result, and any console errors. File issues by behavior (panel layout, rename, persistence, or regression) and include a screenshot when the layout is involved.
