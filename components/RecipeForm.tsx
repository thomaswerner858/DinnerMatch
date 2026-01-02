
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Plus, Utensils, BookOpen, Image as ImageIcon, Camera } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setImageUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !recipeText) return;

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
        {/* Foto Upload Bereich */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
            <ImageIcon size={14} /> Foto vom Gericht
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative h-48 w-full bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-orange-300 transition-colors group"
          >
            {imagePreview ? (
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
          className="w-full bg-orange-600 text-white font-bold py-5 rounded-[2rem] shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 mt-4"
        >
          <Plus size={22} />
          Rezept hinzufügen
        </button>
      </form>
    </motion.div>
  );
};

export default RecipeForm;
