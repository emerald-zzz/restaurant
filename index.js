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

// Endpoint pour ajouter le panier en tant que commande
app.post('/add-cart-as-command', async (req, res) => {
  const userId = 1; // Utilisateur ayant l'ID 1 (à adapter à vos besoins)
  const currentDate = Date.now(); // Date actuelle (en millisecondes depuis l'époque)

  const connection = await connectionPromise;

  try {
    // 1. Insérez une nouvelle commande dans la table `commande`
    const result = await connection.run('INSERT INTO commande (id_utilisateur, id_etat_commande, date) VALUES (?, ?, ?)', [userId, 1, currentDate]);

    // Obtenez l'ID de la commande nouvellement insérée
    const newCommandId = result.lastID;

    // 2. Parcourez les produits du panier et insérez-les dans la table `commande_produit`
    for (const product of cart) {
      await connection.run('INSERT INTO commande_produit (id_commande, id_produit, quantite) VALUES (?, ?, ?)', [newCommandId, product.id, product.quantity]);
    }

    res.json({ message: 'Panier ajouté en tant que commande avec succès.' });
  } catch (error) {
    console.error('Erreur lors de lajout du panier en tant que commande:', error);
    res.status(500).json({ error: 'Erreur lors de lajout du panier en tant que commande' });
  }
});

// Endpoint pour récupérer les données de la commande
app.get('/get-commandes', async (req, res) => {
  try {
    const connection = await connectionPromise;

    const commandes = await connection.all(`
      SELECT cp.id_commande, p.nom, p.prix, cp.quantite, ec.nom AS etat
      FROM commande_produit cp
      INNER JOIN produit p ON cp.id_produit = p.id_produit
      INNER JOIN etat_commande ec ON ec.id_etat_commande = 1
    `);

    res.json({ commandes });
  } catch (error) {
    console.error('Erreur lors de la récupération des données de la commande:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données de la commande' });
  }

});


// Endpoint pour supprimer une commande
app.delete('/delete-commande/:id', async (req, res) => {
  const commandeId = parseInt(req.params.id);

  try {
    const connection = await connectionPromise;
    
    // Supprimez d'abord les produits liés à la commande dans la table `commande_produit`
    await connection.run('DELETE FROM commande_produit WHERE id_commande = ?', [commandeId]);
    
    // Ensuite, supprimez la commande elle-même de la table `commande`
    await connection.run('DELETE FROM commande WHERE id_commande = ?', [commandeId]);

    res.sendStatus(200);
  } catch (error) {
    console.error('Erreur lors de la suppression de la commande:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la commande' });
  }
});






app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
