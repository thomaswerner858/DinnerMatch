
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Recipe, User } from '../types';
import { Utensils, Heart } from 'lucide-react';

interface MatchCelebrationProps {
  recipe: Recipe;
  user: User;
  partner: User;
  onClose: () => void;
}

const MatchCelebration: React.FC<MatchCelebrationProps> = ({ recipe, user, partner, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-orange-600/95 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-rose-400" />
        
        <div className="flex justify-center -space-x-4 mb-6">
          <img src={user.avatar} className="w-20 h-20 rounded-full border-4 border-white shadow-lg" alt={user.name} />
          <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center z-10">
            <Heart className="text-rose-500 fill-rose-500" size={32} />
          </div>
          <img src={partner.avatar} className="w-20 h-20 rounded-full border-4 border-white shadow-lg" alt={partner.name} />
        </div>

        <h2 className="text-3xl font-black text-gray-900 mb-2 italic">IT'S A MATCH!</h2>
        <p className="text-gray-600 mb-6">
          Ihr wollt beide heute <span className="font-bold text-orange-600">{recipe.title}</span> essen!
        </p>

        <div className="rounded-2xl overflow-hidden mb-8 shadow-md">
          <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-40 object-cover" />
        </div>

        <div className="space-y-4">
          <button
            onClick={onClose}
            className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
          >
            <Utensils size={20} />
            An die Töpfe, fertig, los!
          </button>
          
          <button
            onClick={onClose}
            className="text-gray-400 font-medium hover:text-gray-600 transition-colors"
          >
            Vielleicht morgen?
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MatchCelebration;
