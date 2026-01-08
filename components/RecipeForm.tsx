
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Plus, Utensils, BookOpen, Image as ImageIcon, Camera, Loader2, Save } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeFormProps {
  initialData?: Recipe | null;
  onSave: (recipe: Omit<Recipe, 'id' | 'createdBy'>, id?: string) => void;
  onCancel: () => void;
}

const RecipeForm: React.FC<RecipeFormProps> = ({ initialData, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [recipeText, setRecipeText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setRecipeText(initialData.recipeText);
      setImageUrl(initialData.imageUrl);
      setImagePreview(initialData.imageUrl);
    }
  }, [initialData]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000; // Höhere Auflösung für bessere Qualität
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas context not found');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
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
    }, initialData?.id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-gray-900 italic">
          {initialData ? 'Rezept anpassen' : 'Neues Rezept'}
        </h2>
        <button onClick={onCancel} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
            <ImageIcon size={14} /> Hauptbild
          </label>
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className="relative h-56 w-full bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-orange-300 transition-colors group"
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-orange-500" />
                <span className="text-xs text-gray-400">Verarbeite Bild...</span>
              </div>
            ) : imagePreview ? (
              <>
                <img src={imagePreview} alt="Vorschau" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                  <div className="bg-white/90 p-3 rounded-full shadow-lg">
                    <Camera className="text-orange-600" size={24} />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-6">
                <div className="bg-white p-4 rounded-full shadow-sm mb-3 inline-block">
                  <Upload className="text-orange-500" size={24} />
                </div>
                <p className="text-sm font-bold text-gray-500 italic">Tippe zum Hochladen</p>
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
            className="w-full bg-gray-50 p-5 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500/20 text-gray-900 font-bold placeholder:text-gray-300 shadow-inner"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
            <BookOpen size={14} /> Anleitung & Zutaten
          </label>
          <textarea 
            required
            value={recipeText}
            onChange={e => setRecipeText(e.target.value)}
            placeholder="Was brauchen wir? Wie wird es gemacht?"
            rows={8}
            className="w-full bg-gray-50 p-5 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500/20 text-gray-900 font-medium placeholder:text-gray-300 resize-none leading-relaxed shadow-inner"
          />
        </div>

        <button 
          type="submit" 
          disabled={isProcessing}
          className={`w-full text-white font-bold py-5 rounded-[2.5rem] shadow-xl transition-all flex items-center justify-center gap-2 mt-4 ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-100'}`}
        >
          {isProcessing ? <Loader2 className="animate-spin" size={22} /> : initialData ? <Save size={22} /> : <Plus size={22} />}
          {initialData ? 'Änderungen speichern' : 'Rezept hinzufügen'}
        </button>
      </form>
    </motion.div>
  );
};

export default RecipeForm;
