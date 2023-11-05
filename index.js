const connectionPromise = require('./src/connexion.js');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const multer = require('multer');

// Define a storage engine that stores the file with a custom name
const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, file, cb) => {
    // Use the product name to create a unique filename
    const uniqueFileName = `${req.body.nom}.jpg`;
    cb(null, uniqueFileName);
  },
});

const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(upload.single('p_image'));

app.post('/ajouter-produit', async (req, res) => {
  const { nom, prix } = req.body;
  const imagePath = req.file.filename; // Get the custom file name created by multer

  const connection = await connectionPromise;

  await connection.run('INSERT INTO produit (nom, chemin_image, prix) VALUES (?, ?, ?)', [nom, imagePath, prix]);

  res.redirect('/');
});

app.get('/get-products', async (req, res) => {
  const connection = await connectionPromise;

  try {
    const products = await connection.all('SELECT id_produit as id, nom, chemin_image, prix FROM produit'); // Include id_produit as id

    res.json({ products });
  } catch (error) {
    console.error('Error fetching product data:', error);
    res.status(500).json({ error: 'Error fetching product data' });
  }
});

// make a route for delete button on admin.html
app.delete('/delete-product/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const connection = await connectionPromise;

  try {
      await connection.run('DELETE FROM produit WHERE id_produit= ?', [id]);
      res.sendStatus(200);
  } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Error deleting product' });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
