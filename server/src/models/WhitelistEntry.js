// server/src/models/Whitelist.js (ESM)
import mongoose from 'mongoose';

const whitelistSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    normalized: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

// Normaliza antes de guardar cuando se usa .save()
whitelistSchema.pre('save', function (next) {
  this.normalized = (this.address || '').trim().toLowerCase();
  next();
});

// Utilidad de normalización reutilizable
whitelistSchema.statics.normalize = (s) => (s || '').trim().toLowerCase();

// ⛳️ MUY IMPORTANTE: fuerza el nombre de la colección
// Pon aquí exactamente el nombre de la colección donde ves el doc en Compass.
// Si tu colección se llama "whitelists" (plural por defecto de Mongoose), deja ese.
// Si se llama "whitelist" o "addresses", pon el que corresponda.
export default mongoose.model('Whitelist', whitelistSchema, 'whitelists');
//                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// cambia 'whitelists' por el nombre real si es distinto
