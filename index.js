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
// Endpoint to handle adding a product to the cart
let cart = [];
app.use(express.json());

// Endpoint to get cart data
app.get('/get-cart', (req, res) => {
  res.json({ cart });
});


// Endpoint to add a product to the cart
app.post('/add-to-cart', async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const connection = await connectionPromise;
    const product = await connection.get('SELECT id_produit as id, nom, chemin_image, prix FROM produit WHERE id_produit = ?', [productId]);

    if (product) {
      cart.push({
        id: product.id,
        name: product.nom,
        price: product.prix,
        quantity: parseInt(quantity),
      });
      res.json({ message: 'Product added to cart successfully' });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).json({ error: 'Error adding product to cart' });
  }
});
// Endpoint to remove a product from the cart
app.post('/remove-from-cart', (req, res) => {
  const { productId } = req.body;
  cart = cart.filter(item => item.id !== productId);
  res.json({ message: 'Product removed from cart successfully' });
});
// Endpoint to get order data
app.get('/add-cart-as-command', async (req, res) => {
  try {
      const connection = await connectionPromise;
      const orders = await connection.all(`
          SELECT cp.quantite, p.id_produit as id, p.nom, p.prix, c.id_etat_commande as etat
          FROM commande_produit cp
          INNER JOIN produit p ON cp.id_produit = p.id_produit
          INNER JOIN commande c ON cp.id_commande = c.id_commande
      `);
      res.json({ orders });
  } catch (error) {
      console.error('Error fetching order data:', error);
      res.status(500).json({ error: 'Error fetching order data' });
  }
});

// Endpoint to update the state of an order
app.put('/update-order-state/:id', async (req, res) => {
  const orderId = parseInt(req.params.id);
  const { newState } = req.body;

  try {
      const connection = await connectionPromise;
      await connection.run('UPDATE commande SET nom = ? WHERE id_commande = ?', [newState, orderId]);
      res.sendStatus(200);
  } catch (error) {
      console.error('Error updating order state:', error);
      res.status(500).json({ error: 'Error updating order state' });
  }
});
// Endpoint to delete an order
app.delete('/delete-order/:id', async (req, res) => {
    const orderId = parseInt(req.params.id);
    
    try {
        const connection = await connectionPromise;
        await connection.run('DELETE FROM commande WHERE id_commande = ?', [orderId]);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Error deleting order' });
    }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
