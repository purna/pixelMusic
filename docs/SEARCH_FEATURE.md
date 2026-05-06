/**
 * Node Search Functionality Documentation
 * 
 * This feature adds search and quick-add functionality to the node editor canvas.
 * Users can now search for nodes and add them to the canvas using a toolbar or context menu.
 */

# Node Search Feature

## Overview
The Node Search feature allows users to quickly find and add nodes to the canvas without navigating through the sidebar menus.

## Features

### 1. Search Toolbar
- **Toggle**: Ctrl/Cmd + F keyboard shortcut
- **Location**: Top-left corner of the canvas
- **Function**: Search for nodes by name, type, or category

### 2. Context Menu
- **Trigger**: Right-click anywhere on the canvas
- **Options**:
  - Add Node - Open search toolbar
  - Search & Add Node - Open search toolbar with focus
  - Add Instrument - Quick-add common instrument
  - Add Effect - Quick-add common effect
  - Add Pattern - Quick-add pattern node

### 3. Search Results
- Real-time filtering as you type
- Shows up to 10 matching nodes
- Displays node name, category, and type
- Click or Enter to add selected node

## Usage

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + F | Toggle search toolbar |
| Enter | Perform search / Add selected node |
| Escape | Close search toolbar or context menu |
| Arrow Up/Down | Navigate search results |

### Mouse Actions
- **Right-click canvas**: Open context menu
- **Click search result**: Add node to canvas
- **Click outside search**: Close search results

### Search Examples
- `sine` - Find sine wave instrument
- `piano` - Find piano instrument
- `delay` - Find delay effect
- `lpf` - Find low pass filter
- `bd` - Find bass drum
- `reverb` - Find reverb effect

## Implementation Details

### NodeSearch Class
**File**: `js/nodeSearch.js`

**Constructor**:
```javascript
new NodeSearch(nodeManager, menuData)
```

**Methods**:
- `toggleSearchToolbar()` - Show/hide search toolbar
- `showSearchToolbar()` - Show search toolbar
- `hideSearchToolbar()` - Hide search toolbar
- `performSearch()` - Execute search with current query
- `findNodes(query)` - Find nodes matching query
- `displaySearchResults()` - Render search results
- `addNode(type, instrument, label)` - Add node to canvas
- `showContextMenu(x, y)` - Show context menu at position
- `hideContextMenu()` - Hide context menu

**Events**:
- Input events on search field
- Click events on search results
- Context menu events on canvas
- Keyboard events (shortcuts)

### Integration
The NodeSearch class integrates with:
- **NodeManager**: For creating and managing nodes
- **MenuData**: For searching available instruments/effects
- **Node Schemas**: For finding node definitions

### DOM Elements
- `#node-search-input` - Search input field
- `#node-search-btn` - Search button
- `#search-results` - Search results container
- `.canvas-search-toolbar` - Search toolbar
- `#canvas-context-menu` - Context menu
- `#node-canvas` - Canvas (right-click target)

## Adding Custom Nodes to Search

Nodes are automatically included in search results if they:
1. Are defined in the menu data (`menuData.menus`)
2. Are defined in node schemas (`nodeSchema.nodes`, `transformNodes`, `controlNodes`)
3. Have a title or ID that matches the search query

## Browser Compatibility
- Chrome/Edge: ✓ Full support
- Firefox: ✓ Full support
- Safari: ✓ Full support

## Future Enhancements
- Search filters (by category, type)
- Recent nodes list
- Favorite/pinned nodes
- Search history
- Fuzzy search for better matching
- Keyboard navigation improvements

## Troubleshooting

**Search toolbar not showing**:
- Check if NodeManager is initialized
- Verify DOM elements exist
- Check for JavaScript errors in console

**No search results**:
- Ensure menu data is loaded
- Check if NodeManager has node schemas
- Try broader search terms

**Context menu not working**:
- Verify right-click is not prevented by other handlers
- Check if context menu element exists
- Ensure no CSS is hiding the menu
