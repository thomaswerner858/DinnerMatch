
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Plus, Utensils, BookOpen, Image as ImageIcon, Camera, Loader2 } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeFormProps {
  onSave: (recipe: Omit<Recipe, 'id' | 'createdBy'>) => void;
  onCancel: () => void;
}

const RecipeForm: React.FC<RecipeFormProps> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [recipeText, setRecipeText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas context not found');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Komprimierung auf 0.7 Qualität für optimale Balance
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessing(true);
        const compressedBase64 = await compressImage(file);
        setImagePreview(compressedBase64);
        setImageUrl(compressedBase64);
      } catch (err) {
        console.error("Bild-Verarbeitung fehlgeschlagen:", err);
        alert("Bild konnte nicht verarbeitet werden.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !recipeText) {
      alert("Bitte fülle alle Pflichtfelder aus.");
      return;
    }

    onSave({
      title,
      recipeText,
      imageUrl: imageUrl || `https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&q=80&w=800`
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-gray-900">Neues Rezept</h2>
        <button onClick={onCancel} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
            <ImageIcon size={14} /> Foto vom Gericht
          </label>
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className="relative h-48 w-full bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-orange-300 transition-colors group"
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-orange-500" />
                <span className="text-xs text-gray-400">Verarbeite Bild...</span>
              </div>
            ) : imagePreview ? (
              <>
                <img src={imagePreview} alt="Vorschau" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="text-white" size={32} />
                </div>
              </>
            ) : (
              <div className="text-center p-6">
                <div className="bg-white p-4 rounded-full shadow-sm mb-3 inline-block">
                  <Upload className="text-orange-500" size={24} />
                </div>
                <p className="text-sm font-bold text-gray-500">Foto auswählen oder machen</p>
                <p className="text-xs text-gray-400 mt-1 italic">Tippe zum Hochladen</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
            <Utensils size={14} /> Name des Gerichts
          </label>
          <input 
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z.B. Mamas Pasta Carbonara"
            className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500/20 text-gray-900 font-medium placeholder:text-gray-300"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
            <BookOpen size={14} /> Rezept (Zutaten & Zubereitung)
          </label>
          <textarea 
            required
            value={recipeText}
            onChange={e => setRecipeText(e.target.value)}
            placeholder="Schreibe hier alles rein: Was brauchen wir? Wie wird es gemacht?"
            rows={8}
            className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500/20 text-gray-900 font-medium placeholder:text-gray-300 resize-none leading-relaxed"
          />
        </div>

        <button 
          type="submit" 
          disabled={isProcessing}
          className={`w-full text-white font-bold py-5 rounded-[2rem] shadow-xl shadow-orange-100 transition-all flex items-center justify-center gap-2 mt-4 ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}
        >
          {isProcessing ? <Loader2 className="animate-spin" size={22} /> : <Plus size={22} />}
          Rezept hinzufügen
        </button>
      </form>
    </motion.div>
  );
};

export default RecipeForm;
