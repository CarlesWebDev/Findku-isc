require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const itemsRoutes = require('../routes/items');
const supabase = require('../lib/supabase');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/cron/cleanup', async (req, res) => {
  const auth = req.headers.authorization;
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('items')
      .delete()
      .in('status', ['selesai', 'diklaim'])
      .lt('created_at', cutoff)
      .select('id');

    if (error) throw error;
    res.json({ deleted: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/items', itemsRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`FindKu jalan di http://localhost:${PORT}`);
  });
}

module.exports = app;