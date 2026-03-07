# Lighting Products App

A local web app showcasing electrical lighting products with bilingual support (English/Farsi).

## Features

- Product catalog with categories (Cables, Light Bulbs, Lamps, Sockets, Extension Cables, Fuse, Fuse Box)
- Bilingual support (English and Farsi) with RTL layout
- User account creation (Person or Company)
- Responsive design with Tailwind CSS

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## API Endpoints

- `GET /api/products` - Get all products (flattened list)
- `GET /api/categories` - Get all categories with nested products
- `POST /api/users` - Create a new user account

## Project Structure

```
cursor-my-web-app/
├── server.js           # Express backend
├── categories.json     # Product categories and items
├── users.json          # User accounts storage
├── package.json        # Project dependencies
├── README.md           # This file
└── public/
    ├── index.html      # Homepage with featured products
    ├── products.html   # Products page with category filter
    └── account.html    # User account creation page
```
