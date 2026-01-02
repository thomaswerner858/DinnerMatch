
import React from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Recipe } from '../types';
import { Heart, X, Info } from 'lucide-react';

interface SwipeCardProps {
  recipe: Recipe;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ recipe, onSwipe, isTop }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const dislikeOpacity = useTransform(x, [-50, -150], [0, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  if (!isTop) {
    return (
      <div className="absolute inset-0 w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <img 
          src={recipe.imageUrl} 
          alt={recipe.title} 
          className="w-full h-3/4 object-cover grayscale-[0.5] opacity-50" 
        />
        <div className="p-6 bg-white">
          <h3 className="text-2xl font-bold text-gray-800">{recipe.title}</h3>
          <p className="text-gray-500 mt-2 line-clamp-2">{recipe.description}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileGrab={{ scale: 1.05 }}
      className="absolute inset-0 w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-gray-100 flex flex-col"
    >
      <div className="relative h-3/4 w-full overflow-hidden">
        <img 
          src={recipe.imageUrl} 
          alt={recipe.title} 
          className="w-full h-full object-cover pointer-events-none" 
        />
        
        {/* Indicators */}
        <motion.div 
          style={{ opacity: likeOpacity }}
          className="absolute top-10 left-10 border-4 border-emerald-500 rounded-lg px-4 py-2 rotate-[-15deg]"
        >
          <span className="text-emerald-500 text-4xl font-black uppercase">Lecker</span>
        </motion.div>

        <motion.div 
          style={{ opacity: dislikeOpacity }}
          className="absolute top-10 right-10 border-4 border-rose-500 rounded-lg px-4 py-2 rotate-[15deg]"
        >
          <span className="text-rose-500 text-4xl font-black uppercase">Näh</span>
        </motion.div>
      </div>

      <div className="p-6 flex-grow flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-2xl font-bold text-gray-900 leading-tight">{recipe.title}</h3>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <Info size={20} />
            </button>
          </div>
          <p className="text-gray-600 mt-2 text-sm md:text-base line-clamp-3">
            {recipe.description}
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap mt-4">
          {recipe.ingredients.slice(0, 3).map((ing, idx) => (
            <span key={idx} className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
              {ing}
            </span>
          ))}
          {recipe.ingredients.length > 3 && (
            <span className="text-gray-400 text-xs py-1">+{recipe.ingredients.length - 3} weitere</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;
