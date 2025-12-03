// Fixed persona endpoints for server.js
// Replace lines 855-861 and 863-877

// Route query to appropriate persona - FIXED
app.post('/api/persona/route', authMiddleware, async (req, res) => {
  try {
    const { query, context } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const routing = routeToPersona(query, context || {});
    
    res.json({
      success: true,
      selectedPersona: routing.selectedPersona,
      reasoning: routing.reasoning,
      confidence: routing.confidence,
      patterns: routing.patterns
    });
  } catch (err) {
    console.error('Persona routing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate chaos attractor visualization - FIXED  
app.post('/api/persona/attractor', authMiddleware, async (req, res) => {
  try {
    const { type, steps, principles } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Attractor type is required (lorenz, chen, or quantum)' });
    }
    
    const attractor = generateAttractorPath(type, steps || 100, principles);
    
    res.json({
      success: true,
      attractor
    });
  } catch (err) {
    console.error('Attractor generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check - FIXED
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy', // Changed from 'ok' to 'healthy'
    timestamp: new Date().toISOString(),
    platform: 'DrBoT Community',
    version: '1.0.0'
  });
});
