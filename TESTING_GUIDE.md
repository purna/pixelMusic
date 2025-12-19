# 🧪 Node Editor Testing Guide

## 🚀 Quick Start Testing

### **Option 1: Standalone Test (Recommended)**
Open `node-test-standalone.html` directly in your browser:
- ✅ No server required
- ✅ No CORS issues
- ✅ All features work offline
- ✅ Perfect for connection system testing

### **Option 2: Full System Test**
Open `index.html` in a web browser:
- ✅ Complete system with all features
- ⚠️ Requires web server for JSON loading
- ⚠️ May have CORS issues when opened directly

## 🔧 Testing Connection System

### **Connection Port Verification**
1. **Look for colored ports** on nodes:
   - 🟢 **Green**: Input ports (left side)
   - 🔵 **Cyan**: Output ports (right side)

2. **Test connection creation**:
   - Drag from output port → input port
   - Check console (F12) for connection logs
   - Verify status updates

3. **Test drag & drop**:
   - Click and drag node titles to move nodes
   - Connections should move with nodes

### **Property Synchronization Test**
1. **Create a node** using "Generate Examples"
2. **Select a node** by clicking it
3. **Check node subtitle** matches selected properties
4. **Update properties** via side panel (if available)
5. **Verify display updates** immediately

### **Fallback System Test**
The system automatically handles missing components:

```
Graph Normalizer: Missing → Uses Basic Normalization
Node Schema: Missing → Uses Legacy Validation  
Audio Library: Missing → Shows Warning Message
```

## 📋 Test Checklist

### **Core Functionality**
- [ ] Nodes render with connection ports
- [ ] Connection ports are clickable/draggable
- [ ] Nodes can be dragged by title
- [ ] Play buttons work on individual nodes
- [ ] "Play All" generates combined patterns
- [ ] Status messages update correctly

### **Connection System**
- [ ] Output ports (cyan) on right side
- [ ] Input ports (green) on left side  
- [ ] Drag from output → input creates connections
- [ ] Console shows connection logs
- [ ] Invalid connections are rejected
- [ ] Connections update when nodes move

### **Property Panel**
- [ ] Side panel opens when node selected
- [ ] Properties match node display
- [ ] Changes sync with node visual
- [ ] Instrument list populates correctly
- [ ] Effect parameters update display

### **Fallback Behavior**
- [ ] System works without graph normalizer
- [ ] Basic validation when schema missing
- [ ] Clear error messages for missing features
- [ ] Graceful degradation to basic mode

## 🐛 Common Issues & Solutions

### **CORS Errors (Fixed in standalone version)**
```
Error: Access to fetch at 'file://...' blocked by CORS policy
```
**Solution**: Use `node-test-standalone.html` or run a local server

### **Missing Connection Ports**
```
Issue: No visible connection ports on nodes
```
**Solution**: Check console for JavaScript errors, ensure CSS loads

### **Property Panel Not Working**
```
Issue: Side panel doesn't show or properties don't sync
```
**Solution**: Check if property schema loaded, fallback should activate

### **Audio Not Working**
```
Error: Strudel library not loaded
```
**Solution**: System shows warning, use basic pattern generation

## 🎯 Expected Test Results

### **Successful Connection Test**
```
Console Output:
✅ "Rendered node Instrument with connection ports"
✅ "Output port clicked for connection" 
✅ "Started connection from Instrument (output)"
✅ "Connection created: conn-123..."
```

### **Successful Property Sync Test**
```
1. Select node → Side panel opens
2. Change property → Node display updates immediately
3. Status shows: "Updated Instrument sound: piano"
```

### **Successful Fallback Test**
```
Status Messages:
⚠️ "Graph normalizer not available - Using basic normalization"
✅ "Using basic normalization fallback"
✅ "Normalized 2 chains using fallback"
```

## 📊 Performance Expectations

- **Node Creation**: < 50ms per node
- **Connection Creation**: < 100ms 
- **Property Updates**: < 25ms visual sync
- **Pattern Generation**: < 200ms for 10 nodes
- **Fallback Activation**: < 10ms detection

## 🛠️ Developer Testing

### **Console Commands**
```javascript
// Test connection creation
nodeManager.testConnection()

// Test fallback normalization
nodeManager.normalizeGraph()

// Check system status
nodeManager.updateSystemStatus()

// Generate test nodes
nodeManager.generateExampleNodes()
```

### **Manual Testing**
1. Open browser dev tools (F12)
2. Monitor console for errors
3. Test all button functions
4. Verify status message updates
5. Check network tab for failed requests

## ✅ Success Criteria

**The connection system is working correctly when:**
- Connection ports render and are interactive
- Drag operations work smoothly
- Property changes sync with visual display  
- Fallback systems activate when needed
- Status messages provide clear feedback
- No JavaScript errors in console
- System degrades gracefully without dependencies