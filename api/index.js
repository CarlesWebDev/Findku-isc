require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const itemsRoutes = require('../routes/items');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/items', itemsRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`FindKu jalan di http://localhost:${PORT}`);
  });
}

module.exports = app;